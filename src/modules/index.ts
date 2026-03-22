import { Router } from 'express';
import authRoutes from './domain/auth/auth.routes';
import userRoutes from './domain/user/user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Future modules mount here:
// router.use('/services', serviceRoutes);
// router.use('/orders', orderRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/disputes', disputeRoutes);
// router.use('/reviews', reviewRoutes);
// router.use('/admin', adminRoutes);

export default router;
