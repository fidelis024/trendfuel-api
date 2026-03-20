// orders/order.routes.ts
import { Router } from 'express';
import { createOrder, getOrder } from './order.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.post('/', authenticate, createOrder);
router.get('/:id', authenticate, getOrder);

export default router;
