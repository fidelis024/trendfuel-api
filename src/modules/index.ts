import { Router } from 'express';
import authRoutes from './domain/auth/auth.routes';
import userRoutes from './domain/user/user.routes';
import serviceRoutes from './services/service.routes';
import orderRoutes from './orders/order.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/orders', orderRoutes);

// Future modules mount here:
// router.use('/payments', paymentRoutes);
// router.use('/disputes', disputeRoutes);
// router.use('/reviews', reviewRoutes);
// router.use('/admin', adminRoutes);

export default router;
