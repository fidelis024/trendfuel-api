// reviews/review.routes.ts
import { Router } from 'express';
import { createReview, getSellerReviews } from './review.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.post('/', authenticate, createReview);
router.get('/seller/:sellerId', getSellerReviews);

export default router;
