import mongoose from 'mongoose';
import { Review } from '../../schemas/mongoose/review.model';
import { Order, OrderStatus } from '../../schemas/mongoose/order.model';
import { User } from '../../schemas/mongoose/user.model';
import { Service } from '../../schemas/mongoose/service.model';
import { ApiError } from '../../utils/ApiError';
import { getPaginationOptions, buildPaginationMeta } from '../../utils/paginate';
import { calculateRankScore } from '../../utils/rankingScore';
import type { CreateReviewInput, GetReviewsQuery } from '../../schemas/zod/review.schema';

// ─── Recalculate Seller Metrics ───────────────────────────────────────────────
// Called after every new review — updates avgRating, completionRate, rankScore

const recalculateSellerMetrics = async (sellerId: string): Promise<void> => {
  // Recalculate avgRating from all visible reviews
  const ratingAgg = await Review.aggregate([
    { $match: { sellerId: new mongoose.Types.ObjectId(sellerId), isVisible: true } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, total: { $sum: 1 } } },
  ]);

  const avgRating = ratingAgg[0]?.avgRating ?? 0;
  const totalReviews = ratingAgg[0]?.total ?? 0;

  // Get existing seller metrics for other fields
  const seller = await User.findById(sellerId);
  if (!seller || !seller.sellerMetrics) return;

  const newAvgRating = Math.round(avgRating * 10) / 10; // round to 1 decimal

  // Update user sellerMetrics
  seller.sellerMetrics.avgRating = newAvgRating;
  await seller.save();

  // Recalculate and update rankScore on all seller's active services
  const newRankScore = calculateRankScore({
    avgRating: newAvgRating,
    completionRate: seller.sellerMetrics.completionRate,
    disputeRate: seller.sellerMetrics.disputeRate,
    totalOrders: seller.sellerMetrics.totalOrders,
    isFeatured: false,
  });

  await Service.updateMany(
    { sellerId: new mongoose.Types.ObjectId(sellerId), isActive: true },
    { $set: { rankScore: newRankScore, 'stats.avgRating': newAvgRating } }
  );
};

// ─── Create Review ────────────────────────────────────────────────────────────

export const createReview = async (buyerId: string, data: CreateReviewInput) => {
  // Validate order exists, belongs to buyer, and is completed
  const order = await Order.findOne({
    _id: data.orderId,
    buyerId: new mongoose.Types.ObjectId(buyerId),
  });

  if (!order) throw ApiError.notFound('Order not found');
  if (order.status !== OrderStatus.COMPLETED) {
    throw ApiError.badRequest('You can only review a completed order');
  }

  // Check no review already exists for this order
  const existing = await Review.findOne({ orderId: data.orderId });
  if (existing) throw ApiError.conflict('You have already reviewed this order');

  const review = await Review.create({
    orderId: new mongoose.Types.ObjectId(data.orderId),
    buyerId: new mongoose.Types.ObjectId(buyerId),
    sellerId: order.sellerId,
    serviceId: order.serviceId,
    rating: data.rating,
    comment: data.comment,
  });

  // Recalculate seller metrics in background — non-blocking
  recalculateSellerMetrics(order.sellerId.toString()).catch((err) =>
    console.error('Failed to recalculate seller metrics:', err)
  );

  return review.populate([
    { path: 'buyerId', select: 'firstName lastName' },
    { path: 'serviceId', select: 'title' },
  ]);
};

// ─── Get Reviews For a Seller ─────────────────────────────────────────────────

export const getSellerReviews = async (sellerId: string, query: GetReviewsQuery) => {
  const { page, limit } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter = {
    sellerId: new mongoose.Types.ObjectId(sellerId),
    isVisible: true,
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('buyerId', 'firstName lastName')
      .populate('serviceId', 'title'),
    Review.countDocuments(filter),
  ]);

  // Calculate rating summary
  const ratingSummary = await Review.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        total: { $sum: 1 },
        fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);

  const summary = ratingSummary[0] ?? {
    avgRating: 0,
    total: 0,
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
  };

  return {
    reviews,
    summary: {
      avgRating: Math.round((summary.avgRating ?? 0) * 10) / 10,
      total: summary.total,
      breakdown: {
        5: summary.fiveStar,
        4: summary.fourStar,
        3: summary.threeStar,
        2: summary.twoStar,
        1: summary.oneStar,
      },
    },
    pagination: buildPaginationMeta(total, page, limit),
  };
};

// ─── Get Reviews For a Service ────────────────────────────────────────────────

export const getServiceReviews = async (serviceId: string, query: GetReviewsQuery) => {
  const { page, limit } = query;
  const { skip } = getPaginationOptions(page, limit);

  const filter = {
    serviceId: new mongoose.Types.ObjectId(serviceId),
    isVisible: true,
  };

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('buyerId', 'firstName lastName'),
    Review.countDocuments(filter),
  ]);

  return { reviews, pagination: buildPaginationMeta(total, page, limit) };
};

// ─── Get My Review For an Order ───────────────────────────────────────────────

export const getMyReview = async (orderId: string, buyerId: string) => {
  const review = await Review.findOne({
    orderId: new mongoose.Types.ObjectId(orderId),
    buyerId: new mongoose.Types.ObjectId(buyerId),
  }).populate('serviceId', 'title');

  if (!review) throw ApiError.notFound('No review found for this order');
  return review;
};

// ─── Delete Review (buyer only, within 24h) ───────────────────────────────────

export const deleteReview = async (reviewId: string, buyerId: string) => {
  const review = await Review.findOne({
    _id: reviewId,
    buyerId: new mongoose.Types.ObjectId(buyerId),
  });

  if (!review) throw ApiError.notFound('Review not found or you do not own it');

  const hoursSincePosted = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSincePosted > 24) {
    throw ApiError.badRequest('Reviews can only be deleted within 24 hours of posting');
  }

  const sellerId = review.sellerId.toString();
  await review.deleteOne();

  // Recalculate seller metrics after deletion
  recalculateSellerMetrics(sellerId).catch((err) =>
    console.error('Failed to recalculate seller metrics after review deletion:', err)
  );
};
