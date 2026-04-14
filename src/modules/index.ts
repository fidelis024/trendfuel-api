import { Router } from 'express';
import authRoutes from './domain/auth/auth.routes';
import userRoutes from './domain/user/user.routes';
import serviceRoutes from './services/service.routes';
import orderRoutes from './orders/order.routes';
import reviewRoutes from './reviews/review.routes';
import disputeRoutes from './disputes/dispute.routes';
import adminRoutes from '../admin/admin.routes';
import paymentRoutes from './payments/payment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/disputes', disputeRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);

// Future modules:
// router.use('/payments', paymentRoutes);

export default router;
