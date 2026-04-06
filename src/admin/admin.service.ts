import mongoose from 'mongoose';
import { User, UserStatus, UserRole } from '../schemas/mongoose/user.model';
import { Service } from '../schemas/mongoose/service.model';
import { Order, OrderStatus } from '../schemas/mongoose/order.model';
import { Transaction } from '../schemas/mongoose/transaction.model';
import { Dispute, DisputeStatus } from '../schemas/mongoose/dispute.model';
import { Wallet } from '../schemas/mongoose/wallet.model';
import { ApiError } from '../utils/ApiError';
import { getPaginationOptions, buildPaginationMeta } from '../utils/paginate';
import { calculateRankScore } from '../utils/rankingScore';
import { Resend } from 'resend';
import env from '../config/env';
import type {
  UpdateUserStatusInput,
  SellerApplicationInput,
  FeatureServiceInput,
  GetUsersQuery,
  AnalyticsQuery,
  AnnouncementInput,
} from '../schemas/zod/admin.schema';

const resend = new Resend(env.RESEND_API_KEY);
const FROM = 'TrendFuel <noreply@trendfuelhq.org>';

// ─── Helper: period to date ───────────────────────────────────────────────────

const periodToDate = (period: string): Date => {
  const now = new Date();
  const days: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
  const d = days[period] ?? 30;
  return new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
};

// ─── User Management ──────────────────────────────────────────────────────────

export const getUsers = async (query: GetUsersQuery) => {
  const { page, limit, role, status, search } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { users, pagination: buildPaginationMeta(total, page, limit) };
};

export const getUserById = async (userId: string) => {
  const [user, wallet, totalOrders] = await Promise.all([
    User.findById(userId),
    Wallet.findOne({ userId }),
    Order.countDocuments({
      $or: [
        { buyerId: new mongoose.Types.ObjectId(userId) },
        { sellerId: new mongoose.Types.ObjectId(userId) },
      ],
    }),
  ]);

  if (!user) throw ApiError.notFound('User not found');
  return { user, wallet, totalOrders };
};

export const updateUserStatus = async (targetUserId: string, data: UpdateUserStatusInput) => {
  const user = await User.findById(targetUserId);
  if (!user) throw ApiError.notFound('User not found');

  user.status = data.status as UserStatus;
  await user.save();

  return user;
};

// ─── Seller Applications ──────────────────────────────────────────────────────

export const getSellerApplications = async (page: number, limit: number) => {
  const { skip } = getPaginationOptions(page, limit);

  const filter = {
    role: UserRole.SELLER,
    'sellerProfile.applicationStatus': 'pending',
  };

  const [applicants, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return { applicants, pagination: buildPaginationMeta(total, page, limit) };
};

export const handleSellerApplication = async (sellerId: string, data: SellerApplicationInput) => {
  const user = await User.findById(sellerId);
  if (!user) throw ApiError.notFound('User not found');
  if (!user.sellerProfile) throw ApiError.badRequest('User has no seller profile');
  if (user.sellerProfile.applicationStatus !== 'pending') {
    throw ApiError.badRequest('Application has already been processed');
  }

  if (data.action === 'approve') {
    user.sellerProfile.applicationStatus = 'approved';
    user.role = UserRole.SELLER;
    user.status = UserStatus.ACTIVE;
  } else {
    user.sellerProfile.applicationStatus = 'rejected';
  }

  await user.save();

  // Email seller about decision
  if (user.email) {
    const subject =
      data.action === 'approve'
        ? 'Your TrendFuel seller application has been approved!'
        : 'Update on your TrendFuel seller application';

    const html =
      data.action === 'approve'
        ? `<p>Hey ${user.firstName}, congratulations! Your seller application has been approved. You can now start listing services on TrendFuel.</p>`
        : `<p>Hey ${user.firstName}, unfortunately your seller application was not approved at this time.${data.reason ? ` Reason: ${data.reason}` : ''}</p>`;

    resend.emails.send({ from: FROM, to: user.email, subject, html }).catch(() => {});
  }

  return user;
};

// ─── Service Management ───────────────────────────────────────────────────────

export const getAllServices = async (page: number, limit: number, isActive?: boolean) => {
  const { skip } = getPaginationOptions(page, limit);
  const filter: Record<string, unknown> = {};
  if (isActive !== undefined) filter.isActive = isActive;

  const [services, total] = await Promise.all([
    Service.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sellerId', 'firstName lastName email')
      .populate('categoryId', 'name platform'),
    Service.countDocuments(filter),
  ]);

  return { services, pagination: buildPaginationMeta(total, page, limit) };
};

export const featureService = async (serviceId: string, data: FeatureServiceInput) => {
  const service = await Service.findById(serviceId);
  if (!service) throw ApiError.notFound('Service not found');

  service.isFeatured = data.isFeatured;

  // Recalculate rank score with featured boost
  const seller = await User.findById(service.sellerId);
  if (seller?.sellerMetrics) {
    service.rankScore = calculateRankScore({
      avgRating: seller.sellerMetrics.avgRating,
      completionRate: seller.sellerMetrics.completionRate,
      disputeRate: seller.sellerMetrics.disputeRate,
      totalOrders: seller.sellerMetrics.totalOrders,
      isFeatured: data.isFeatured,
    });
  }

  await service.save();
  return service;
};

export const adminDeleteService = async (serviceId: string) => {
  const service = await Service.findById(serviceId);
  if (!service) throw ApiError.notFound('Service not found');

  service.isActive = false;
  await service.save();
};

// ─── Order Management ─────────────────────────────────────────────────────────

export const getAllOrders = async (page: number, limit: number, status?: string) => {
  const { skip } = getPaginationOptions(page, limit);
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email')
      .populate('serviceId', 'title'),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Platform Analytics ───────────────────────────────────────────────────────

export const getAnalytics = async (query: AnalyticsQuery) => {
  const { period } = query;
  const startDate = periodToDate(period);

  // ── Totals ──
  const [
    totalUsers,
    totalBuyers,
    totalSellers,
    totalOrders,
    totalCompletedOrders,
    totalDisputes,
    openDisputes,
    totalServices,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: UserRole.BUYER }),
    User.countDocuments({ role: UserRole.SELLER }),
    Order.countDocuments(),
    Order.countDocuments({ status: OrderStatus.COMPLETED }),
    Dispute.countDocuments(),
    Dispute.countDocuments({ status: { $ne: DisputeStatus.RESOLVED } }),
    Service.countDocuments({ isActive: true }),
  ]);

  // ── Revenue totals ──
  const revenueAgg = await Transaction.aggregate([
    { $match: { type: 'commission', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total ?? 0;

  const periodRevenueAgg = await Transaction.aggregate([
    {
      $match: {
        type: 'commission',
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const periodRevenue = periodRevenueAgg[0]?.total ?? 0;

  // ── Time-series: revenue per day ──
  const revenueTimeSeries = await Transaction.aggregate([
    {
      $match: {
        type: 'commission',
        status: 'completed',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    {
      $project: {
        _id: 0,
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
          },
        },
        revenue: 1,
        count: 1,
      },
    },
  ]);

  // ── Time-series: new users per day ──
  const usersTimeSeries = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        buyers: {
          $sum: { $cond: [{ $eq: ['$role', UserRole.BUYER] }, 1, 0] },
        },
        sellers: {
          $sum: { $cond: [{ $eq: ['$role', UserRole.SELLER] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    {
      $project: {
        _id: 0,
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
          },
        },
        buyers: 1,
        sellers: 1,
        total: 1,
      },
    },
  ]);

  // ── Time-series: orders per day ──
  const ordersTimeSeries = await Order.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month',
          day: '$_id.day',
        },
        statuses: {
          $push: { status: '$_id.status', count: '$count' },
        },
        total: { $sum: '$count' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    {
      $project: {
        _id: 0,
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
          },
        },
        statuses: 1,
        total: 1,
      },
    },
  ]);

  // ── Top sellers by earnings ──
  const topSellers = await Wallet.aggregate([
    { $match: { type: 'seller' } },
    { $sort: { lifetimeEarnings: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$user._id',
        name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        email: '$user.email',
        lifetimeEarnings: 1,
        clearedBalance: 1,
      },
    },
  ]);

  // ── Order status breakdown ──
  const orderStatusBreakdown = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ]);

  return {
    overview: {
      totalUsers,
      totalBuyers,
      totalSellers,
      totalOrders,
      totalCompletedOrders,
      totalDisputes,
      openDisputes,
      totalServices,
      totalRevenue,
      periodRevenue,
      period,
    },
    timeSeries: {
      revenue: revenueTimeSeries,
      users: usersTimeSeries,
      orders: ordersTimeSeries,
    },
    topSellers,
    orderStatusBreakdown,
  };
};

// ─── Announcements ────────────────────────────────────────────────────────────

export const sendAnnouncement = async (data: AnnouncementInput) => {
  const filter: Record<string, unknown> = {
    emailVerified: true,
    status: UserStatus.ACTIVE,
  };
  if (data.targetRole !== 'all') filter.role = data.targetRole;

  const users = await User.find(filter).select('email firstName').lean();

  if (users.length === 0) throw ApiError.badRequest('No users found matching target');

  // Send in batches of 50 to avoid rate limits
  const BATCH_SIZE = 50;
  let sent = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map((user: { email: string }) =>
        resend.emails.send({
          from: FROM,
          to: user.email,
          subject: data.subject,
          html: `
            <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0f1117;padding:40px 20px;">
              <div style="max-width:560px;margin:0 auto;background:#1a1d2e;border-radius:12px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 40px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">TrendFuel</h1>
                </div>
                <div style="padding:32px 40px;">
                  <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0;">${data.message.replace(/\n/g, '<br/>')}</p>
                </div>
                <div style="padding:20px 40px;border-top:1px solid #2d3148;text-align:center;">
                  <p style="margin:0;color:#334155;font-size:12px;">&copy; ${new Date().getFullYear()} TrendFuel. All rights reserved.</p>
                </div>
              </div>
            </div>
          `,
        })
      )
    );

    sent += batch.length;
  }

  return { sent, total: users.length };
};

// ─── Commission Settings ──────────────────────────────────────────────────────

export const getCommissionSettings = async () => {
  const { getConfig } = await import('../config/platformconfig');
  const config = await getConfig();

  // Calculate revenue breakdown
  const revenueAgg = await Transaction.aggregate([
    { $match: { type: 'commission', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalRevenue = revenueAgg[0]?.total ?? 0;

  const sellerEarningsAgg = await Transaction.aggregate([
    { $match: { type: 'escrow_release', status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalSellerEarnings = sellerEarningsAgg[0]?.total ?? 0;

  const grossRevenue = totalRevenue + totalSellerEarnings;

  return {
    config: {
      commissionRate: config.commissionRate,
      commissionPercent: `${(config.commissionRate * 100).toFixed(0)}%`,
      sellerAccessFee: config.sellerAccessFee,
      withdrawalFeeRate: config.withdrawalFeeRate,
      orderAutoCompleteHours: config.orderAutoCompleteHours,
      sellerRespondHours: config.sellerRespondHours,
      withdrawalDelayDays: config.withdrawalDelayDays,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
    },
    revenue: {
      totalPlatformCommission: totalRevenue,
      totalSellerEarnings: totalSellerEarnings,
      grossRevenue,
      platformPercent:
        grossRevenue > 0 ? `${((totalRevenue / grossRevenue) * 100).toFixed(1)}%` : '0%',
      sellerPercent:
        grossRevenue > 0 ? `${((totalSellerEarnings / grossRevenue) * 100).toFixed(1)}%` : '0%',
    },
  };
};

export const updateCommissionSettings = async (
  updates: Record<string, unknown>,
  adminId: string
) => {
  const { updateConfig } = await import('../config/platformconfig');
  return updateConfig(updates as any, adminId);
};

// ─── Admin Management ─────────────────────────────────────────────────────────

export const getAllAdmins = async () => {
  const admins = await User.find({
    role: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN ?? 'super_admin'] },
  }).sort({ createdAt: -1 });

  return admins;
};

export const makeAdmin = async (targetUserId: string, requesterId: string) => {
  if (targetUserId === requesterId) {
    throw ApiError.badRequest('You cannot modify your own admin status');
  }

  const user = await User.findById(targetUserId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'admin' || user.role === 'super_admin') {
    throw ApiError.conflict('User is already an admin');
  }

  user.role = UserRole.ADMIN;
  await user.save();

  return user;
};

export const removeAdmin = async (targetUserId: string, requesterId: string) => {
  if (targetUserId === requesterId) {
    throw ApiError.badRequest('You cannot remove your own admin status');
  }

  const user = await User.findById(targetUserId);
  if (!user) throw ApiError.notFound('User not found');

  if (user.role === 'super_admin') {
    throw ApiError.forbidden('Cannot demote a super admin');
  }

  if (user.role !== 'admin') {
    throw ApiError.badRequest('User is not an admin');
  }

  // Demote back to buyer
  user.role = UserRole.BUYER;
  await user.save();

  return user;
};
