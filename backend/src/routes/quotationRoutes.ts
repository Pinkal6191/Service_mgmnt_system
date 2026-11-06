import { Router } from 'express';
import { 
  createQuotation, 
  getQuotation, 
  addQuotationItem, 
  updateQuotationItem, 
  removeQuotationItem, 
  sendQuotation,
  approveQuotation,
  rejectQuotation
} from '../controllers/quotationController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Create quotation
router.post('/', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), createQuotation);

// Get quotation
router.get('/:id', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN', 'CUSTOMER']), getQuotation);

// Add item
router.post('/:id/items', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), addQuotationItem);

// Update item
router.patch('/:id/items/:itemId', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), updateQuotationItem);

// Remove item
router.delete('/:id/items/:itemId', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), removeQuotationItem);

// Send quotation
router.post('/:id/send', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'TECHNICIAN']), sendQuotation);

// Customer approval
router.post('/:id/approve', authenticate, authorize(['CUSTOMER']), approveQuotation);

// Customer rejection
router.post('/:id/reject', authenticate, authorize(['CUSTOMER']), rejectQuotation);

export default router;
