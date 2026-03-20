// admin/admin.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middlewares';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

// Admin routes will be added here

export default router;
