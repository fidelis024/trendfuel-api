import mongoose from 'mongoose';
import { Order, OrderStatus } from '../../schemas/mongoose/order.model';
import { Review } from '../../schemas/mongoose/review.model';
import { Service } from '../../schemas/mongoose/service.model';
import { Wallet } from '../../schemas/mongoose/wallet.model';
import { User } from '../../schemas/mongoose/user.model';
import { ApiError } from '../../utils/ApiError';

// ─── Buyer Dashboard ──────────────────────────────────────────────────────────

export const getBuyerDashboard = async (buyerId: string) => {
  const buyerObjectId = new mongoose.Types.ObjectId(buyerId);

  const [
    totalOrders,
    activeOrders,
    totalSpentAgg,
    recentOrders,
    reviewsLeftCount,
    wallet,
  ] = await Promise.all([
    // Total orders ever placed
    Order.countDocuments({ buyerId: buyerObjectId }),

    // Active = pending + processing + delivered
    Order.countDocuments({
      buyerId: buyerObjectId,
      status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.DELIVERED] },
    }),

    // Total amount spent (completed orders only)
    Order.aggregate([
      {
        $match: {
          buyerId: buyerObjectId,
          status: OrderStatus.COMPLETED,
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),

    // Recent 5 orders
    Order.find({ buyerId: buyerObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('serviceId', 'title')
      .populate('sellerId', 'firstName lastName')
      .select('status totalAmount createdAt serviceId sellerId'),

    // Completed orders not yet reviewed
    Order.aggregate([
      {
        $match: {
          buyerId: buyerObjectId,
          status: OrderStatus.COMPLETED,
        },
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'orderId',
          as: 'review',
        },
      },
      { $match: { review: { $size: 0 } } },
      { $count: 'count' },
    ]),

    // Wallet balance
    Wallet.findOne({ userId: buyerId }).select('balance'),
  ]);

  return {
    stats: {
      totalOrders,
      activeOrders,
      totalSpent: totalSpentAgg[0]?.total ?? 0,        // in kobo
      reviewsLeft: reviewsLeftCount[0]?.count ?? 0,
      walletBalance: wallet?.balance ?? 0,              // in kobo
    },
    recentOrders,
  };
};

// ─── Seller Dashboard ─────────────────────────────────────────────────────────

export const getSellerDashboard = async (sellerId: string) => {
  const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeServices,
    pendingOrders,
    recentOrders,
    totalEarningsAgg,
    thisMonthEarningsAgg,
    wallet,
    seller,
  ] = await Promise.all([
    // Active service listings
    Service.countDocuments({ sellerId: sellerObjectId, isActive: true }),

    // Pending orders needing action (pending + processing)
    Order.countDocuments({
      sellerId: sellerObjectId,
      status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
    }),

    // Recent 5 orders
    Order.find({ sellerId: sellerObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('serviceId', 'title')
      .populate('buyerId', 'firstName lastName')
      .select('status sellerEarnings totalAmount createdAt serviceId buyerId'),

    // Total lifetime earnings (completed orders)
    Order.aggregate([
      {
        $match: {
          sellerId: sellerObjectId,
          status: OrderStatus.COMPLETED,
        },
      },
      { $group: { _id: null, total: { $sum: '$sellerEarnings' } } },
    ]),

    // This month earnings
    Order.aggregate([
      {
        $match: {
          sellerId: sellerObjectId,
          status: OrderStatus.COMPLETED,
          completedAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$sellerEarnings' } } },
    ]),

    // Seller wallet
    Wallet.findOne({ userId: sellerId }).select('pendingBalance clearedBalance'),

    // Seller metrics (avgRating)
    User.findById(sellerId).select('sellerMetrics sellerProfile'),
  ]);

  return {
    stats: {
      activeServices,
      pendingOrders,
      totalEarnings: totalEarningsAgg[0]?.total ?? 0,        // in kobo
      thisMonthEarnings: thisMonthEarningsAgg[0]?.total ?? 0, // in kobo
      avgRating: seller?.sellerMetrics?.avgRating ?? 0,
      pendingBalance: wallet?.pendingBalance ?? 0,
      clearedBalance: wallet?.clearedBalance ?? 0,
    },
    recentOrders,
  };
};