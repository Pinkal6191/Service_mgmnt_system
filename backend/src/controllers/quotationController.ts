import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { isTransitionAllowed } from '../services/jobStateMachine';
import { JobStatus, QuotationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const generateQuotationNumber = () => {
  return `QT-${Math.floor(10000 + Math.random() * 90000)}`;
};

const recalculateQuotationTotals = async (tx: any, quotationId: string) => {
  const quotation = await tx.quotation.findUnique({
    where: { id: quotationId },
    include: { items: true }
  });
  if (!quotation) return;

  let totalTax = new Decimal(0);
  let totalItemsPrice = new Decimal(0);

  for (const item of quotation.items) {
    totalTax = totalTax.plus(item.tax_amount);
    totalItemsPrice = totalItemsPrice.plus(item.total_price);
  }

  const discount = new Decimal(quotation.discount || 0);
  const totalAmount = totalItemsPrice.minus(discount);

  await tx.quotation.update({
    where: { id: quotationId },
    data: {
      tax_amount: totalTax,
      total_amount: totalAmount
    }
  });
};

const verifyQuotationOwnership = async (quotationId: string, user: any) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      job: {
        include: { booking: true }
      }
    }
  });

  if (!quotation) return null;

  if (user.role === 'CUSTOMER' && quotation.job.booking.customer_id !== user.id) return null;
  if (user.role === 'TECHNICIAN' && quotation.job.technician_id !== user.id) return null;
  if (user.role === 'BRANCH_ADMIN' && quotation.job.booking.branch_id !== user.branch_id) return null;

  return quotation;
};

const verifyJobOwnership = async (jobId: string, user: any) => {
  const job = await prisma.jobAssignment.findUnique({
    where: { id: jobId },
    include: { booking: true }
  });

  if (!job) return null;

  if (user.role === 'CUSTOMER' && job.booking.customer_id !== user.id) return null;
  if (user.role === 'TECHNICIAN' && job.technician_id !== user.id) return null;
  if (user.role === 'BRANCH_ADMIN' && job.booking.branch_id !== user.branch_id) return null;

  return job;
};

export const createQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { job_id, labour_charges = 0, material_charges = 0, discount = 0 } = req.body;
    const user = (req as any).user;

    if (user.role === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot create quotations' });
      return;
    }

    const job = await verifyJobOwnership(job_id, user);
    if (!job) {
      res.status(404).json({ error: 'Job not found or access denied' });
      return;
    }

    const existingQuotation = await prisma.quotation.findUnique({ where: { job_id } });
    if (existingQuotation) {
      res.status(400).json({ error: 'Job already has a quotation' });
      return;
    }

    if (!isTransitionAllowed(job.status as JobStatus, 'QUOTATION_PENDING')) {
      res.status(400).json({ error: `Invalid job status transition: ${job.status} -> QUOTATION_PENDING` });
      return;
    }

    const newQuotation = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          job_id,
          quotation_number: generateQuotationNumber(),
          labour_charges: new Decimal(labour_charges),
          material_charges: new Decimal(material_charges),
          discount: new Decimal(discount),
          tax_amount: new Decimal(0),
          total_amount: new Decimal(0).minus(new Decimal(discount)),
          status: 'DRAFT'
        }
      });

      await tx.jobAssignment.update({
        where: { id: job_id },
        data: { status: 'QUOTATION_PENDING' }
      });

      return quotation;
    });

    res.status(201).json(newQuotation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
};

export const getQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const quotation = await verifyQuotationOwnership(id, user);
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or access denied' });
      return;
    }

    const fullQuotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        job: { select: { id: true, status: true, booking_id: true, technician_id: true } }
      }
    });

    res.status(200).json(fullQuotation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
};

export const addQuotationItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { item_name, quantity, unit_price, tax_rate } = req.body;
    const user = (req as any).user;

    if (user.role === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot modify quotations' });
      return;
    }

    const quotation = await verifyQuotationOwnership(id, user);
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or access denied' });
      return;
    }

    if (quotation.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT quotations can be modified' });
      return;
    }

    if (!item_name || Number(quantity) <= 0 || Number(unit_price) < 0 || Number(tax_rate) < 0) {
      res.status(400).json({ error: 'Invalid item data' });
      return;
    }

    const qty = new Decimal(quantity);
    const price = new Decimal(unit_price);
    const taxRate = new Decimal(tax_rate);

    const subtotal = qty.mul(price);
    const taxAmount = subtotal.mul(taxRate).div(100).toDecimalPlaces(2);
    const totalPrice = subtotal.add(taxAmount).toDecimalPlaces(2);

    const item = await prisma.$transaction(async (tx) => {
      const newItem = await tx.quotationItem.create({
        data: {
          quotation_id: id,
          item_name,
          quantity: Number(quantity),
          unit_price: price,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_price: totalPrice
        }
      });
      await recalculateQuotationTotals(tx, id);
      return newItem;
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add quotation item' });
  }
};

export const updateQuotationItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const { item_name, quantity, unit_price, tax_rate } = req.body;
    const user = (req as any).user;

    if (user.role === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot modify quotations' });
      return;
    }

    const quotation = await verifyQuotationOwnership(id, user);
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or access denied' });
      return;
    }

    if (quotation.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT quotations can be modified' });
      return;
    }

    const existingItem = await prisma.quotationItem.findUnique({ where: { id: itemId } });
    if (!existingItem || existingItem.quotation_id !== id) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const qty = quantity !== undefined ? new Decimal(quantity) : existingItem.quantity;
    const price = unit_price !== undefined ? new Decimal(unit_price) : existingItem.unit_price;
    const taxRate = tax_rate !== undefined ? new Decimal(tax_rate) : existingItem.tax_rate;

    if (Number(qty) <= 0 || Number(price) < 0 || Number(taxRate) < 0) {
      res.status(400).json({ error: 'Invalid item data' });
      return;
    }

    const subtotal = new Decimal(qty).mul(new Decimal(price));
    const taxAmount = subtotal.mul(new Decimal(taxRate)).div(100).toDecimalPlaces(2);
    const totalPrice = subtotal.add(taxAmount).toDecimalPlaces(2);

    const updatedItem = await prisma.$transaction(async (tx) => {
      const item = await tx.quotationItem.update({
        where: { id: itemId },
        data: {
          item_name: item_name !== undefined ? item_name : existingItem.item_name,
          quantity: Number(qty),
          unit_price: new Decimal(price),
          tax_rate: new Decimal(taxRate),
          tax_amount: taxAmount,
          total_price: totalPrice
        }
      });
      await recalculateQuotationTotals(tx, id);
      return item;
    });

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quotation item' });
  }
};

export const removeQuotationItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, itemId } = req.params;
    const user = (req as any).user;

    if (user.role === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot modify quotations' });
      return;
    }

    const quotation = await verifyQuotationOwnership(id, user);
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or access denied' });
      return;
    }

    if (quotation.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT quotations can be modified' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.quotationItem.delete({
        where: { id: itemId }
      });
      await recalculateQuotationTotals(tx, id);
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove quotation item' });
  }
};

export const sendQuotation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (user.role === 'CUSTOMER') {
      res.status(403).json({ error: 'Customers cannot send quotations' });
      return;
    }

    const quotation = await verifyQuotationOwnership(id, user);
    if (!quotation) {
      res.status(404).json({ error: 'Quotation not found or access denied' });
      return;
    }

    if (quotation.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT quotations can be sent' });
      return;
    }

    // Check items
    const itemsCount = await prisma.quotationItem.count({ where: { quotation_id: id } });
    if (itemsCount === 0) {
      res.status(400).json({ error: 'Quotation has no valid items' });
      return;
    }

    if (!isTransitionAllowed(quotation.job.status as JobStatus, 'AWAITING_CUSTOMER_APPROVAL')) {
      res.status(400).json({ error: `Invalid job status transition: ${quotation.job.status} -> AWAITING_CUSTOMER_APPROVAL` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await recalculateQuotationTotals(tx, id);
      
      await tx.quotation.update({
        where: { id },
        data: { status: 'SENT' }
      });

      await tx.jobAssignment.update({
        where: { id: quotation.job_id },
        data: { status: 'AWAITING_CUSTOMER_APPROVAL' }
      });
    });

    res.status(200).json({ message: 'Quotation sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send quotation' });
  }
};
