// services/service.routes.ts
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';

const router = Router();

router.get('/', authenticate);
router.post('/', authenticate);

export default router;
