import { Router } from 'express';
import { getMasterDashboard, getBranchDashboard } from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/master', authenticate, authorize(['MASTER_ADMIN']), getMasterDashboard);
router.get('/branch', authenticate, authorize(['BRANCH_ADMIN']), getBranchDashboard);

export default router;
