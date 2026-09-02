import { Router } from 'express';
import { createCategory, getCategories, createService, getServices } from '../controllers/serviceController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Master Admin only routes for creation
router.post('/categories', authenticate, authorize(['MASTER_ADMIN']), createCategory);
router.post('/', authenticate, authorize(['MASTER_ADMIN']), createService);

// Everyone can view active categories and services (even unauthenticated customers can browse services usually, but we can secure it if needed)
router.get('/categories', getCategories);
router.get('/', getServices);

export default router;
