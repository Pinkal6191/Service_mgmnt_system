import { Router } from 'express';
import { upsertSetting, getSettings } from '../controllers/settingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Only Master Admin can modify settings
router.post('/', authenticate, authorize(['MASTER_ADMIN']), upsertSetting);

// Authenticated users might need to view settings (e.g. GST details, Company Name)
router.get('/', authenticate, getSettings);

export default router;
