import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Generate random invoice number
const generateInvoiceNumber = () => {
  return `INV-${Math.floor(10000 + Math.random() * 90000)}`;
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { job_id, labour_charges, material_charges, gst_amount, discount } = req.body;

    const final_amount = (Number(labour_charges) + Number(material_charges) + Number(gst_amount)) - Number(discount);

    const invoice = await prisma.invoice.create({
      data: {
        job_id,
        invoice_number: generateInvoiceNumber(),
        labour_charges,
        material_charges,
        gst_amount,
        discount,
        final_amount,
        status: 'UNPAID'
      }
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    // In a real scenario, you'd filter by customer_id if user is CUSTOMER
    // Since Invoice is tied to Job -> Booking -> Customer, we need to handle that.
    let whereClause = {};

    if (user.role === 'CUSTOMER') {
      whereClause = {
        job: { booking: { customer_id: user.id } }
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        job: {
          include: { booking: { include: { service: true } } }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { invoice_id, amount, payment_mode, transaction_reference } = req.body;

    const payment = await prisma.payment.create({
      data: {
        invoice_id,
        amount,
        payment_mode,
        transaction_reference
      }
    });

    // Update invoice status based on total paid
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoice_id },
      include: { payments: true }
    });

    if (invoice) {
      const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      let status = invoice.status;
      
      if (totalPaid >= Number(invoice.final_amount)) {
        status = 'PAID';
      } else if (totalPaid > 0) {
        status = 'PARTIAL';
      }

      await prisma.invoice.update({
        where: { id: invoice_id },
        data: { status }
      });
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment' });
  }
};
