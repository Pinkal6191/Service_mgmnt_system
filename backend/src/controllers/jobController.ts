import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Master Admin or Branch Admin can assign jobs
export const assignJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { booking_id, technician_id } = req.body;

    const job = await prisma.jobAssignment.create({
      data: {
        booking_id,
        technician_id,
        status: 'ASSIGNED'
      }
    });

    // Also update booking status to ASSIGNED
    await prisma.booking.update({
      where: { id: booking_id },
      data: { status: 'ASSIGNED' }
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign job' });
  }
};

// Technician accepts or rejects job
export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, tech_notes } = req.body;
    // Status can be ACCEPTED, REJECTED, STARTED, COMPLETED

    const data: any = { status };
    if (tech_notes) data.tech_notes = tech_notes;

    if (status === 'ACCEPTED') data.accepted_at = new Date();
    if (status === 'STARTED') data.started_at = new Date();
    if (status === 'COMPLETED') data.completed_at = new Date();

    const job = await prisma.jobAssignment.update({
      where: { id },
      data
    });

    // Update booking status if completed
    if (status === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: job.booking_id },
        data: { status: 'COMPLETED' }
      });
    }

    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job status' });
  }
};

export const getJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    const whereClause: any = {};
    if (user.role === 'TECHNICIAN') {
      whereClause.technician_id = user.id;
    }
    
    const jobs = await prisma.jobAssignment.findMany({
      where: whereClause,
      include: {
        booking: {
          include: { customer: { select: { id: true, full_name: true, phone: true } }, service: true }
        }
      },
      orderBy: { assigned_at: 'desc' }
    });

    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};
