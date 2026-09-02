import { Router } from 'express';
import { createUser, getUsers } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Master Admin and Branch Admin can create users (like technicians)
router.post('/', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN']), createUser);

// Admins can list users (can be filtered by role/branch in query)
router.get('/', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN']), getUsers);

export default router;
