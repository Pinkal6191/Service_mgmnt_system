import { Router } from 'express';
import { createInvoice, getInvoices, createPayment } from '../controllers/billingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Technicians/Admins generate invoices
router.post('/invoices', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), createInvoice);

// All roles can view invoices (controller handles scoping)
router.get('/invoices', authenticate, getInvoices);

// Payments (usually recorded by Admin/Tech on behalf of customer, or by Customer via gateway)
router.post('/payments', authenticate, createPayment);

export default router;
