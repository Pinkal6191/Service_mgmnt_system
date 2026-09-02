import { Router } from 'express';
import { createCity, getCities, createBranch, getBranches } from '../controllers/locationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Master Admin only routes for creation
router.post('/cities', authenticate, authorize(['MASTER_ADMIN']), createCity);
router.post('/branches', authenticate, authorize(['MASTER_ADMIN']), createBranch);

// Everyone can view active cities and branches (or modify authorization as needed)
router.get('/cities', authenticate, getCities);
router.get('/branches', authenticate, getBranches);

export default router;
