import mongoose from 'mongoose';
import { Order, OrderStatus } from '../../schemas/mongoose/order.model';
import { Service } from '../../schemas/mongoose/service.model';
import { User } from '../../schemas/mongoose/user.model';
import { Wallet, WalletType } from '../../schemas/mongoose/wallet.model';
import { ApiError } from '../../utils/ApiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/paginate';
import { holdFunds, releaseFunds, refundFunds } from '../../modules/escrow/escrow.service';
import {
  sendNewOrderEmail,
  sendOrderDeliveredEmail,
  sendOrderCompletedEmail,
  sendOrderCancelledEmail,
} from '../../utils/email';
import env from '../../config/env';
import type { PlaceOrderInput, GetOrdersQuery } from '../../schemas/zod/order.schema';
import { getConfig } from '../../config/platformconfig';

// const { getConfig } = await import('../../config/platformconfig');
const config = getConfig();
const COMMISSION_RATE = config.commissionRate;
const AUTO_COMPLETE_HOURS = env.ORDER_AUTO_COMPLETE_HOURS ?? 72;

// ─── Ensure Wallet Exists ─────────────────────────────────────────────────────

const ensureWallet = async (userId: string, type: WalletType, session: mongoose.ClientSession) => {
  const existing = await Wallet.findOne({ userId }).session(session);
  if (existing) return existing;
  const created = await Wallet.create([{ userId, type }], { session });
  return created[0];
};

// ─── Place Order ──────────────────────────────────────────────────────────────

export const placeOrder = async (buyerId: string, data: PlaceOrderInput) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate service
    const service = await Service.findOne({ _id: data.serviceId, isActive: true })
      .populate('sellerId', 'firstName lastName email')
      .session(session);

    if (!service) throw ApiError.notFound('Service not found or is no longer available');
    if (service.sellerId.toString() === buyerId)
      throw ApiError.badRequest('You cannot order your own service');
    if (data.quantity < service.minQty || data.quantity > service.maxQty) {
      throw ApiError.badRequest(`Quantity must be between ${service.minQty} and ${service.maxQty}`);
    }

    // Calculate amounts
    const totalAmount = service.pricePerUnit * data.quantity;
    const platformFee = Math.round(totalAmount * COMMISSION_RATE);
    const sellerEarnings = totalAmount - platformFee;

    // Ensure buyer wallet exists
    await ensureWallet(buyerId, WalletType.BUYER, session);

    // Create order
    const [order] = await Order.create(
      [
        {
          buyerId: new mongoose.Types.ObjectId(buyerId),
          sellerId: service.sellerId,
          serviceId: service._id,
          quantity: data.quantity,
          unitPrice: service.pricePerUnit,
          totalAmount,
          platformFee,
          sellerEarnings,
          status: OrderStatus.PENDING,
          buyerNote: data.buyerNote ?? null,
          autoCompleteAt: new Date(Date.now() + AUTO_COMPLETE_HOURS * 60 * 60 * 1000),
        },
      ],
      { session }
    );

    // Hold funds in escrow
    await holdFunds(session, order._id.toString(), buyerId, totalAmount);

    await session.commitTransaction();

    // Send email to seller (outside transaction — non-critical)
    const seller = service.sellerId as any;
    const buyer = await User.findById(buyerId).select('firstName lastName');

    if (seller?.email) {
      sendNewOrderEmail(seller.email, seller.firstName, {
        orderId: order._id.toString(),
        serviceTitle: service.title,
        quantity: data.quantity,
        totalAmount,
        buyerName: buyer ? `${buyer.firstName} ${buyer.lastName}` : 'A buyer',
      }).catch((err) => console.error('Failed to send new order email:', err));
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Get Orders ───────────────────────────────────────────────────────────────

export const getOrders = async (userId: string, role: string, query: GetOrdersQuery) => {
  const { page, limit, status } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter: Record<string, unknown> = {};
  if (role === 'buyer') filter.buyerId = new mongoose.Types.ObjectId(userId);
  else if (role === 'seller') filter.sellerId = new mongoose.Types.ObjectId(userId);
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('serviceId', 'title pricePerUnit')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email'),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Get Order By ID ──────────────────────────────────────────────────────────

export const getOrderById = async (orderId: string, userId: string, role: string) => {
  const order = await Order.findById(orderId)
    .populate('serviceId', 'title description pricePerUnit deliveryHours')
    .populate('buyerId', 'firstName lastName email')
    .populate('sellerId', 'firstName lastName email sellerProfile');

  if (!order) throw ApiError.notFound('Order not found');

  // Only buyer, seller, or admin can view
  const isBuyer = order.buyerId._id.toString() === userId;
  const isSeller = order.sellerId._id.toString() === userId;
  if (!isBuyer && !isSeller && role !== 'admin') {
    throw ApiError.forbidden('You do not have access to this order');
  }

  return order;
};

// ─── Mark as Delivered ────────────────────────────────────────────────────────

export const deliverOrder = async (orderId: string, sellerId: string, deliveryLink: string) => {
  const order = await Order.findOne({ _id: orderId, sellerId }).populate(
    'buyerId',
    'firstName lastName email'
  );

  if (!order) throw ApiError.notFound('Order not found or you do not own this order');
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
    throw ApiError.badRequest(`Cannot deliver an order with status: ${order.status}`);
  }

  order.status = OrderStatus.DELIVERED;
  order.deliveryLink = deliveryLink;
  order.deliveredAt = new Date();
  // Reset the auto-complete timer from delivery time
  order.autoCompleteAt = new Date(Date.now() + AUTO_COMPLETE_HOURS * 60 * 60 * 1000);
  await order.save();

  // Email buyer
  const buyer = order.buyerId as any;
  const service = await Service.findById(order.serviceId).select('title');
  if (buyer?.email && service) {
    sendOrderDeliveredEmail(buyer.email, buyer.firstName, {
      orderId: order._id.toString(),
      serviceTitle: service.title,
      deliveryLink,
    }).catch((err) => console.error('Failed to send delivery email:', err));
  }

  return order;
};

// ─── Complete Order ───────────────────────────────────────────────────────────

export const completeOrder = async (orderId: string, buyerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: orderId, buyerId })
      .populate('sellerId', 'firstName lastName email')
      .session(session);

    if (!order) throw ApiError.notFound('Order not found');
    if (order.status !== OrderStatus.DELIVERED) {
      throw ApiError.badRequest('Order must be delivered before it can be completed');
    }

    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();
    await order.save({ session });

    // Release escrow to seller
    await releaseFunds(
      session,
      orderId,
      order.sellerId.toString(),
      order.sellerEarnings,
      order.platformFee
    );

    await session.commitTransaction();

    // Email seller
    const seller = order.sellerId as any;
    const service = await Service.findById(order.serviceId).select('title');
    if (seller?.email && service) {
      sendOrderCompletedEmail(seller.email, seller.firstName, {
        orderId: order._id.toString(),
        serviceTitle: service.title,
        earnings: order.sellerEarnings,
      }).catch((err) => console.error('Failed to send completion email:', err));
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Cancel Order ─────────────────────────────────────────────────────────────

export const cancelOrder = async (orderId: string, userId: string, role: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId)
      .populate('buyerId', 'firstName lastName email')
      .session(session);

    if (!order) throw ApiError.notFound('Order not found');

    const isBuyer = order.buyerId._id.toString() === userId;
    const isAdmin = role === 'admin';

    if (!isBuyer && !isAdmin) {
      throw ApiError.forbidden('Only the buyer or admin can cancel this order');
    }

    // Can only cancel if not yet delivered
    if (![OrderStatus.PENDING, OrderStatus.PROCESSING].includes(order.status as OrderStatus)) {
      throw ApiError.badRequest(`Cannot cancel an order with status: ${order.status}`);
    }

    order.status = OrderStatus.CANCELLED;
    await order.save({ session });

    // Refund buyer
    await refundFunds(session, orderId, order.buyerId._id.toString(), order.totalAmount);

    await session.commitTransaction();

    // Email buyer
    const buyer = order.buyerId as any;
    const service = await Service.findById(order.serviceId).select('title');
    if (buyer?.email && service) {
      sendOrderCancelledEmail(buyer.email, buyer.firstName, {
        serviceTitle: service.title,
        refundAmount: order.totalAmount,
      }).catch((err) => console.error('Failed to send cancellation email:', err));
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// ─── Auto-Complete Expired Orders (called by cron) ────────────────────────────

export const autoCompleteExpiredOrders = async (): Promise<number> => {
  const expiredOrders = await Order.find({
    status: OrderStatus.DELIVERED,
    autoCompleteAt: { $lte: new Date() },
  }).populate('sellerId', 'firstName lastName email');

  let completed = 0;

  for (const order of expiredOrders) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();
      await order.save({ session });

      await releaseFunds(
        session,
        order._id.toString(),
        order.sellerId.toString(),
        order.sellerEarnings,
        order.platformFee
      );

      await session.commitTransaction();
      completed++;

      // Email seller
      const seller = order.sellerId as any;
      const service = await Service.findById(order.serviceId).select('title');
      if (seller?.email && service) {
        sendOrderCompletedEmail(seller.email, seller.firstName, {
          orderId: order._id.toString(),
          serviceTitle: service.title,
          earnings: order.sellerEarnings,
        }).catch(() => {});
      }
    } catch (err) {
      await session.abortTransaction();
      console.error(`Failed to auto-complete order ${order._id}:`, err);
    } finally {
      session.endSession();
    }
  }

  return completed;
};
