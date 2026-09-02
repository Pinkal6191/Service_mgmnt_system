import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Generate a random booking reference like BKG-1045
const generateBookingReference = () => {
  return `BKG-${Math.floor(1000 + Math.random() * 9000)}`;
};

export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { service_id, branch_id, preferred_date_time, address, problem_description } = req.body;
    // req.user is set by the auth middleware
    const customer_id = (req as any).user.id;

    const booking = await prisma.booking.create({
      data: {
        booking_reference: generateBookingReference(),
        customer_id,
        service_id,
        branch_id,
        preferred_date_time: new Date(preferred_date_time),
        address,
        problem_description,
        status: 'PENDING'
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

export const getBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    const whereClause: any = {};
    
    // If the user is a CUSTOMER, they can only see their own bookings
    if (user.role === 'CUSTOMER') {
      whereClause.customer_id = user.id;
    }
    // If the user is a BRANCH_ADMIN, they can only see bookings for their branch
    else if (user.role === 'BRANCH_ADMIN') {
      whereClause.branch_id = user.branch_id;
    }
    // MASTER_ADMIN can see all bookings
    
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, full_name: true, phone: true } },
        service: { select: { id: true, name: true, base_price: true } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};
