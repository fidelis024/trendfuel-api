// reviews/review.service.ts
import Review, { IReview } from './review.model';

export class ReviewService {
  async createReview(reviewData: any): Promise<IReview> {
    const review = new Review(reviewData);
    await review.save();
    return review;
  }

  async getReviewsBySeller(sellerId: string): Promise<IReview[]> {
    return Review.find({ sellerId });
  }
}

export default new ReviewService();
