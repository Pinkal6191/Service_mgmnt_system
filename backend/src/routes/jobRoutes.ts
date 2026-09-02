import { Router } from 'express';
import { assignJob, updateJobStatus, getJobs } from '../controllers/jobController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Admins can assign jobs
router.post('/assign', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN']), assignJob);

// Technicians can update their job status
router.patch('/:id/status', authenticate, authorize(['TECHNICIAN', 'MASTER_ADMIN', 'BRANCH_ADMIN']), updateJobStatus);

// Technicians see their jobs, Admins see all
router.get('/', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), getJobs);

export default router;
