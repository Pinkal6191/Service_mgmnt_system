import { Router } from 'express';
import { createBooking, getBookings } from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Customers can create bookings
router.post('/', authenticate, authorize(['CUSTOMER']), createBooking);

// Master Admin, Branch Admin, and Customers can view bookings (controller handles data scoping)
router.get('/', authenticate, authorize(['MASTER_ADMIN', 'BRANCH_ADMIN', 'CUSTOMER']), getBookings);

export default router;
