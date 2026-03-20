// sellers/seller.routes.ts
import { Router } from 'express';
import { getSeller } from './seller.controller';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.get('/:id', authenticate, getSeller);

export default router;
