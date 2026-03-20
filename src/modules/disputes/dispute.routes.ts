// disputes/dispute.routes.ts
import { Router } from 'express';
import { createDispute, resolveDispute } from './dispute.controller';
import { authenticate, authorize } from '../../middlewares';

const router = Router();

router.post('/', authenticate, createDispute);
router.patch('/:id/resolve', authenticate, authorize('admin'), resolveDispute);

export default router;
