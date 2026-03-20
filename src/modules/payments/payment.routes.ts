// payments/payment.routes.ts
import { Router } from 'express';
import { initiatePayment } from './payment.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.post('/', authenticate, initiatePayment);

export default router;
