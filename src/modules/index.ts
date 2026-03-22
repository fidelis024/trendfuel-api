import { Router } from 'express';
import authRoutes from './domain/auth/auth.routes';

const router = Router();

router.use('/auth', authRoutes);

// Future modules mount here:
// router.use('/users', userRoutes);
// router.use('/services', serviceRoutes);
// router.use('/orders', orderRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/disputes', disputeRoutes);
// router.use('/reviews', reviewRoutes);
// router.use('/admin', adminRoutes);

export default router;
