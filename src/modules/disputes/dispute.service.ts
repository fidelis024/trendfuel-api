import mongoose from 'mongoose';
import {
  Dispute,
  DisputeStatus,
  DisputeResolution,
  SellerPenalty,
} from '../../schemas/mongoose/dispute.model';
import { DisputeEvidence, EvidenceUploader } from '../../schemas/mongoose/disputeevidence.model';
import { Order, OrderStatus } from '../../schemas/mongoose/order.model';
import { User, UserStatus } from '../../schemas/mongoose/user.model';
import { Service } from '../../schemas/mongoose/service.model';
import { ApiError } from '../../utils/ApiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/paginate';
import { uploadToCloudinary } from '../../utils/upload';
import { calculateRankScore } from '../../utils/rankingScore';
import { releaseFunds, refundFunds } from '../../modules/escrow/escrow.service';
import { sendDisputeOpenedEmail, sendDisputeResolvedEmail } from '../../utils/email';
import env from '../../config/env';
import type {
  OpenDisputeInput,
  SellerRespondInput,
  ResolveDisputeInput,
  GetDisputesQuery,
} from '../../schemas/zod/dispute.schema';

const SELLER_RESPOND_HOURS = env.SELLER_RESPOND_HOURS ?? 48;

// ─── Open Dispute ─────────────────────────────────────────────────────────────

export const openDispute = async (buyerId: string, data: OpenDisputeInput) => {
  const order = await Order.findOne({
    _id: data.orderId,
    buyerId: new mongoose.Types.ObjectId(buyerId),
  }).populate('sellerId', 'firstName lastName email');

  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== OrderStatus.DELIVERED) {
    throw ApiError.badRequest('You can only dispute a delivered order');
  }

  // Check no dispute already exists
  const existing = await Dispute.findOne({ orderId: data.orderId });
  if (existing) throw ApiError.conflict('A dispute already exists for this order');

  const sellerRespondBy = new Date(Date.now() + SELLER_RESPOND_HOURS * 60 * 60 * 1000);

  const dispute = await Dispute.create({
    orderId: new mongoose.Types.ObjectId(data.orderId),
    buyerId: new mongoose.Types.ObjectId(buyerId),
    sellerId: order.sellerId,
    reason: data.reason,
    buyerStatement: data.buyerStatement,
    sellerRespondBy,
    status: DisputeStatus.OPEN,
  });

  // Lock order — cannot complete or cancel while disputed
  order.status = OrderStatus.DISPUTED;
  await order.save();

  // Email seller
  const seller = order.sellerId as any;
  const service = await Service.findById(order.serviceId).select('title');
  if (seller?.email && service) {
    sendDisputeOpenedEmail(seller.email, seller.firstName, {
      disputeId: dispute._id.toString(),
      serviceTitle: service.title,
      respondBy: sellerRespondBy,
    }).catch((err) => console.error('Failed to send dispute email:', err));
  }

  return dispute;
};

// ─── Seller Respond ───────────────────────────────────────────────────────────

export const sellerRespond = async (
  disputeId: string,
  sellerId: string,
  data: SellerRespondInput
) => {
  const dispute = await Dispute.findOne({
    _id: disputeId,
    sellerId: new mongoose.Types.ObjectId(sellerId),
  });

  if (!dispute) throw ApiError.notFound('Dispute not found or you are not the seller');
  if (dispute.status !== DisputeStatus.OPEN) {
    throw ApiError.badRequest('You can only respond to an open dispute');
  }

  dispute.sellerResponse = data.sellerResponse;
  dispute.status = DisputeStatus.SELLER_RESPONDED;
  await dispute.save();

  return dispute;
};

// ─── Upload Evidence ──────────────────────────────────────────────────────────

export const uploadEvidence = async (
  disputeId: string,
  userId: string,
  role: 'buyer' | 'seller',
  file: Express.Multer.File
) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw ApiError.notFound('Dispute not found');

  // Validate user is part of this dispute
  const isBuyer = dispute.buyerId.toString() === userId;
  const isSeller = dispute.sellerId.toString() === userId;
  if (!isBuyer && !isSeller) throw ApiError.forbidden('You are not part of this dispute');

  // Cannot upload evidence on a resolved dispute
  if (dispute.status === DisputeStatus.RESOLVED) {
    throw ApiError.badRequest('Cannot upload evidence on a resolved dispute');
  }

  // Max 5 evidence files per party
  const existingCount = await DisputeEvidence.countDocuments({
    disputeId: new mongoose.Types.ObjectId(disputeId),
    uploadedBy: new mongoose.Types.ObjectId(userId),
  });
  if (existingCount >= 5) {
    throw ApiError.badRequest('Maximum 5 evidence files allowed per party');
  }

  const { url, publicId } = await uploadToCloudinary(
    file.buffer,
    file.mimetype,
    `trendfuel/disputes/${disputeId}`
  );

  const evidence = await DisputeEvidence.create({
    disputeId: new mongoose.Types.ObjectId(disputeId),
    uploadedBy: new mongoose.Types.ObjectId(userId),
    uploaderRole: role === 'buyer' ? EvidenceUploader.BUYER : EvidenceUploader.SELLER,
    fileUrl: url,
    publicId,
    fileType: file.mimetype,
    fileName: file.originalname,
  });

  return evidence;
};

// ─── Get Dispute By ID ────────────────────────────────────────────────────────

export const getDisputeById = async (disputeId: string, userId: string, role: string) => {
  const dispute = await Dispute.findById(disputeId)
    .populate('orderId', 'totalAmount serviceId quantity')
    .populate('buyerId', 'firstName lastName email')
    .populate('sellerId', 'firstName lastName email')
    .populate('resolvedBy', 'firstName lastName');

  if (!dispute) throw ApiError.notFound('Dispute not found');

  const isBuyer = dispute.buyerId._id.toString() === userId;
  const isSeller = dispute.sellerId._id.toString() === userId;
  if (!isBuyer && !isSeller && role !== 'admin') {
    throw ApiError.forbidden('You do not have access to this dispute');
  }

  // Fetch evidence
  const evidence = await DisputeEvidence.find({
    disputeId: new mongoose.Types.ObjectId(disputeId),
  }).populate('uploadedBy', 'firstName lastName');

  return { dispute, evidence };
};

// ─── Get Disputes ─────────────────────────────────────────────────────────────

export const getDisputes = async (userId: string, role: string, query: GetDisputesQuery) => {
  const { page, limit, status } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter: Record<string, unknown> = {};

  if (role === 'buyer') filter.buyerId = new mongoose.Types.ObjectId(userId);
  else if (role === 'seller') filter.sellerId = new mongoose.Types.ObjectId(userId);
  // admin sees all

  if (status) filter.status = status;

  const [disputes, total] = await Promise.all([
    Dispute.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderId', 'totalAmount')
      .populate('buyerId', 'firstName lastName')
      .populate('sellerId', 'firstName lastName'),
    Dispute.countDocuments(filter),
  ]);

  return { disputes, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Resolve Dispute (Admin) ──────────────────────────────────────────────────

export const resolveDispute = async (
  disputeId: string,
  adminId: string,
  data: ResolveDisputeInput
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute) throw ApiError.notFound('Dispute not found');
    if (dispute.status === DisputeStatus.RESOLVED) {
      throw ApiError.badRequest('This dispute is already resolved');
    }

    const order = await Order.findById(dispute.orderId).session(session);
    if (!order) throw ApiError.notFound('Associated order not found');

    // Validate partial refund amount
    if (
      data.resolution === DisputeResolution.REFUND_PARTIAL &&
      data.refundAmount > order.totalAmount
    ) {
      throw ApiError.badRequest('Partial refund cannot exceed order total');
    }

    // ── Handle escrow based on resolution ──
    if (data.resolution === DisputeResolution.REFUND_FULL) {
      await refundFunds(
        session,
        order._id.toString(),
        dispute.buyerId.toString(),
        order.totalAmount
      );
      order.status = OrderStatus.REFUNDED;
    } else if (data.resolution === DisputeResolution.REFUND_PARTIAL) {
      const refundAmount = data.refundAmount ?? 0;
      const sellerAmount = order.totalAmount - refundAmount;

      // Refund buyer portion
      if (refundAmount > 0) {
        await refundFunds(session, order._id.toString(), dispute.buyerId.toString(), refundAmount);
      }

      // Release seller portion (minus platform fee proportionally)
      if (sellerAmount > 0) {
        const proportionalFee = Math.round((sellerAmount / order.totalAmount) * order.platformFee);
        const sellerEarnings = sellerAmount - proportionalFee;
        await releaseFunds(
          session,
          order._id.toString(),
          dispute.sellerId.toString(),
          sellerEarnings,
          proportionalFee
        );
      }

      order.status = OrderStatus.COMPLETED;
    } else {
      // no_refund — release full amount to seller
      await releaseFunds(
        session,
        order._id.toString(),
        dispute.sellerId.toString(),
        order.sellerEarnings,
        order.platformFee
      );
      order.status = OrderStatus.COMPLETED;
    }

    await order.save({ session });

    // ── Apply seller penalty ──
    if (data.sellerPenalty && data.sellerPenalty !== SellerPenalty.NONE) {
      const seller = await User.findById(dispute.sellerId).session(session);
      if (seller) {
        if (data.sellerPenalty === SellerPenalty.SUSPENSION) {
          seller.status = UserStatus.SUSPENDED;
        } else if (data.sellerPenalty === SellerPenalty.BAN) {
          seller.status = UserStatus.BANNED;
        } else if (data.sellerPenalty === SellerPenalty.RANKING_DROP) {
          // Drop rank score by 20 on all their services
          await Service.updateMany(
            { sellerId: dispute.sellerId, isActive: true },
            { $inc: { rankScore: -20 } }
          ).session(session);
        }
        // WARNING — just noted in adminNote, no system action
        await seller.save({ session });
      }
    }

    // ── Resolve dispute ──
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolution = data.resolution as DisputeResolution;
    dispute.refundAmount = data.refundAmount ?? 0;
    dispute.sellerPenalty = (data.sellerPenalty as SellerPenalty) ?? SellerPenalty.NONE;
    dispute.resolvedBy = new mongoose.Types.ObjectId(adminId);
    dispute.adminNote = data.adminNote ?? null;
    dispute.resolvedAt = new Date();
    await dispute.save({ session });

    await session.commitTransaction();

    // Email both parties
    const service = await Service.findById(order.serviceId).select('title');
    const serviceTitle = service?.title ?? 'your order';

    const [buyer, seller] = await Promise.all([
      User.findById(dispute.buyerId).select('firstName email'),
      User.findById(dispute.sellerId).select('firstName email'),
    ]);

    const emailPayload = {
      disputeId: dispute._id.toString(),
      serviceTitle,
      resolution: data.resolution,
      refundAmount: data.refundAmount ?? 0,
    };

    if (buyer?.email) {
      sendDisputeResolvedEmail(buyer.email, buyer.firstName, emailPayload).catch(() => {});
    }
    if (seller?.email) {
      sendDisputeResolvedEmail(seller.email, seller.firstName, emailPayload).catch(() => {});
    }

    return dispute;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
