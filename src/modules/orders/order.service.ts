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
import type { PlaceOrderInput, GetOrdersQuery } from '../../schemas/zod/order.schema';
import { getCommissionRate, getAutoCompleteHours } from '../../config/platformconfig';
import { PlatformConfig } from '../../schemas/mongoose/platformconfig.model';

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
    // const [COMMISSION_RATE, AUTO_COMPLETE_HOURS] = await Promise.all([
    //   getCommissionRate(),
    //   getAutoCompleteHours(),
    // ]);

    const COMMISSION_RATE = await PlatformConfig.findOne()
      .select('commissionRate')
      .lean()
      .then((config) => config?.commissionRate ?? 0.2);
    const AUTO_COMPLETE_HOURS = await PlatformConfig.findOne()
      .select('orderAutoCompleteHours')
      .lean()
      .then((config) => config?.orderAutoCompleteHours ?? 72);

    const service = await Service.findOne({ _id: data.serviceId, isActive: true })
      .populate<{
        sellerId: {
          _id: mongoose.Types.ObjectId;
          firstName: string;
          lastName: string;
          email: string;
        };
      }>('sellerId', 'firstName lastName email')
      .session(session);

    if (!service) throw ApiError.notFound('Service not found or is no longer available');
    const unitPriceInCents = service.pricePerUnit; // dollars → cents
    const totalAmount = unitPriceInCents * data.quantity;
    // console.log('Total amount in cents:', totalAmount);
    const platformFee = Math.round(totalAmount * COMMISSION_RATE);
    // console.log('Platform fee in cents:', platformFee);
    const sellerEarnings = totalAmount - platformFee;
    // console.log('Seller earnings in cents:', sellerEarnings);

    const [order] = await Order.create(
      [
        {
          buyerId: new mongoose.Types.ObjectId(buyerId),
          sellerId: service.sellerId,
          serviceId: service._id,
          quantity: data.quantity,
          unitPrice: unitPriceInCents, // stored in cents
          totalAmount, // stored in cents
          platformFee, // stored in cents
          sellerEarnings, // stored in cents
          status: OrderStatus.PENDING,
          autoCompleteAt: new Date(Date.now() + AUTO_COMPLETE_HOURS * 60 * 60 * 1000),
          buyerNote: data.buyerNote ?? null,
        },
      ],
      { session }
    );

    await holdFunds(session, order._id.toString(), buyerId, totalAmount);

    await session.commitTransaction();

    // Email seller about the new order — fire-and-forget
    const seller = service.sellerId;
    const buyer = await User.findById(buyerId).select('firstName lastName');
    if (seller?.email && buyer) {
      sendNewOrderEmail(seller.email, seller.firstName, {
        orderId: order._id.toString(),
        serviceTitle: service.title,
        quantity: data.quantity,
        totalAmount,
        buyerName: `${buyer.firstName} ${buyer.lastName}`,
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
  // admins and super_admins see all orders — no filter needed
  if (status) filter.status = status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('serviceId', 'title pricePerUnit requiresCredentials')
      .populate('buyerId', 'firstName lastName email')
      .populate('sellerId', 'firstName lastName email'),
    Order.countDocuments(filter),
  ]);

  return { orders, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Get Order By ID ──────────────────────────────────────────────────────────

export const getOrderById = async (orderId: string, userId: string, role: string) => {
  const order = await Order.findById(orderId)
    .populate('serviceId', 'title description pricePerUnit deliveryHours requiresCredentials')
    .populate('buyerId', 'firstName lastName email')
    .populate('sellerId', 'firstName lastName email sellerProfile');

  if (!order) throw ApiError.notFound('Order not found');

  const isBuyer = order.buyerId._id.toString() === userId;
  const isSeller = order.sellerId._id.toString() === userId;
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!isBuyer && !isSeller && !isAdmin) {
    throw ApiError.forbidden('You do not have access to this order');
  }

  return order;
};

// ─── Mark as Delivered ────────────────────────────────────────────────────────

export const deliverOrder = async (
  orderId: string,
  sellerId: string,
  data: { deliveryLink?: string; credentials?: { label: string; value: string }[] }
) => {
  const AUTO_COMPLETE_HOURS = await getAutoCompleteHours();

  const order = await Order.findOne({ _id: orderId, sellerId })
    .populate<{
      serviceId: { _id: mongoose.Types.ObjectId; title: string; requiresCredentials: boolean };
    }>('serviceId', 'title requiresCredentials')
    .populate('buyerId', 'firstName lastName email');

  if (!order) throw ApiError.notFound('Order not found or you do not own this order');

  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
    throw ApiError.badRequest(`Cannot deliver an order with status: ${order.status}`);
  }

  const service = order.serviceId as any;

  // Enforce credentials if service requires them
  if (service?.requiresCredentials) {
    if (!data.credentials || data.credentials.length === 0) {
      throw ApiError.badRequest('This service requires credentials to be attached on delivery');
    }
  }

  // At least one of deliveryLink or credentials must be provided
  if (!data.deliveryLink && (!data.credentials || data.credentials.length === 0)) {
    throw ApiError.badRequest('Please provide a delivery link or credentials');
  }

  order.status = OrderStatus.DELIVERED;
  order.deliveryLink = data.deliveryLink ?? null;
  order.deliveredAt = new Date();
  // Reset auto-complete timer from delivery time
  order.autoCompleteAt = new Date(Date.now() + AUTO_COMPLETE_HOURS * 60 * 60 * 1000);

  if (data.credentials && data.credentials.length > 0) {
    order.credentials = data.credentials;
    order.credentialsUpdatedAt = new Date();
  }

  await order.save();

  // Email buyer — fire-and-forget
  const buyer = order.buyerId as any;
  if (buyer?.email && service) {
    sendOrderDeliveredEmail(buyer.email, buyer.firstName, {
      orderId: order._id.toString(),
      serviceTitle: service.title,
      deliveryLink: data.deliveryLink ?? 'See credentials attached to this order',
    }).catch((err) => console.error('Failed to send delivery email:', err));
  }

  return order;
};

// ─── Complete Order ───────────────────────────────────────────────────────────

// ─── Complete Order ───────────────────────────────────────────────────────────

export const completeOrder = async (orderId: string, buyerId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: orderId, buyerId })
      .populate<{
        sellerId: {
          _id: mongoose.Types.ObjectId;
          firstName: string;
          lastName: string;
          email: string;
        };
      }>('sellerId', 'firstName lastName email')
      .session(session);

    if (!order) throw ApiError.notFound('Order not found');
    if (order.status !== OrderStatus.DELIVERED) {
      throw ApiError.badRequest('Order must be delivered before it can be completed');
    }

    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();
    await order.save({ session });

    // ── FIX: after populate(), sellerId is the full object — use ._id ─────────
    const seller = order.sellerId;
    const sellerIdString = seller._id.toString();
    // ─────────────────────────────────────────────────────────────────────────

    await releaseFunds(
      session,
      orderId,
      sellerIdString, // ← was: order.sellerId.toString() which gave "[object Object]"
      order.sellerEarnings,
      order.platformFee
    );

    await session.commitTransaction();

    // Email seller — fire-and-forget
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

// ─── Auto-Complete Expired Orders (called by cron) ────────────────────────────

export const autoCompleteExpiredOrders = async (): Promise<number> => {
  const expiredOrders = await Order.find({
    status: OrderStatus.DELIVERED,
    autoCompleteAt: { $lte: new Date() },
  }).populate<{
    sellerId: { _id: mongoose.Types.ObjectId; firstName: string; lastName: string; email: string };
  }>('sellerId', 'firstName lastName email');

  let completed = 0;

  for (const order of expiredOrders) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();
      await order.save({ session });

      // ── FIX: same issue — extract _id from populated sellerId ─────────────
      const seller = order.sellerId;
      const sellerIdString = seller._id.toString();
      // ─────────────────────────────────────────────────────────────────────

      await releaseFunds(
        session,
        order._id.toString(),
        sellerIdString, // ← was: order.sellerId.toString()
        order.sellerEarnings,
        order.platformFee
      );

      await session.commitTransaction();
      completed++;

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
    const isAdmin = role === 'admin' || role === 'super_admin';

    if (!isBuyer && !isAdmin) {
      throw ApiError.forbidden('Only the buyer or admin can cancel this order');
    }

    if (![OrderStatus.PENDING, OrderStatus.PROCESSING].includes(order.status as OrderStatus)) {
      throw ApiError.badRequest(`Cannot cancel an order with status: ${order.status}`);
    }

    order.status = OrderStatus.CANCELLED;
    await order.save({ session });

    // Full refund back to buyer wallet
    await refundFunds(session, orderId, order.buyerId._id.toString(), order.totalAmount);

    await session.commitTransaction();

    // Email buyer — fire-and-forget
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

// ─── Get Order Credentials ────────────────────────────────────────────────────

export const getOrderCredentials = async (orderId: string, userId: string, role: string) => {
  const order = await Order.findById(orderId).select(
    'buyerId sellerId status credentials credentialsUpdatedAt serviceId'
  );

  if (!order) throw ApiError.notFound('Order not found');

  const isBuyer = order.buyerId.toString() === userId;
  const isSeller = order.sellerId.toString() === userId;
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!isBuyer && !isSeller && !isAdmin) {
    throw ApiError.forbidden('You do not have access to this order');
  }

  // Buyers can only see credentials after order is completed — protects seller from escrow bypass
  if (isBuyer && order.status !== OrderStatus.COMPLETED) {
    throw ApiError.forbidden(
      'Credentials are only accessible once the order is marked as completed'
    );
  }

  if (!order.credentials || order.credentials.length === 0) {
    throw ApiError.notFound('No credentials have been attached to this order');
  }

  return {
    orderId: order._id,
    credentials: order.credentials,
    credentialsUpdatedAt: order.credentialsUpdatedAt,
  };
};

// ─── Auto-Complete Expired Orders (called by cron) ────────────────────────────

// export const autoCompleteExpiredOrders = async (): Promise<number> => {
//   const expiredOrders = await Order.find({
//     status: OrderStatus.DELIVERED,
//     autoCompleteAt: { $lte: new Date() },
//   }).populate('sellerId', 'firstName lastName email');

//   let completed = 0;

//   for (const order of expiredOrders) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       order.status = OrderStatus.COMPLETED;
//       order.completedAt = new Date();
//       await order.save({ session });

//       await releaseFunds(
//         session,
//         order._id.toString(),
//         order.sellerId.toString(),
//         order.sellerEarnings,
//         order.platformFee
//       );

//       await session.commitTransaction();
//       completed++;

//       const seller = order.sellerId as any;
//       const service = await Service.findById(order.serviceId).select('title');
//       if (seller?.email && service) {
//         sendOrderCompletedEmail(seller.email, seller.firstName, {
//           orderId: order._id.toString(),
//           serviceTitle: service.title,
//           earnings: order.sellerEarnings,
//         }).catch(() => {});
//       }
//     } catch (err) {
//       await session.abortTransaction();
//       console.error(`Failed to auto-complete order ${order._id}:`, err);
//     } finally {
//       session.endSession();
//     }
//   }

//   return completed;
// };
