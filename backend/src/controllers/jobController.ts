import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { isTransitionAllowed } from '../services/jobStateMachine';
import { JobStatus, BookingStatus } from '@prisma/client';

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

const getBookingStatusForJobStatus = (status: JobStatus): BookingStatus | null => {
  if (status === 'ASSIGNED') return 'ASSIGNED';
  if (status === 'STARTED' || status === 'IN_PROGRESS') return 'IN_PROGRESS';
  // Other statuses don't explicitly trigger a Booking change unless all are completed
  return null;
};

// Technician accepts or rejects job
export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, tech_notes } = req.body;
    const requestedStatus = status as JobStatus;
    const user = (req as any).user;

    const job = await prisma.jobAssignment.findUnique({
      where: { id }
    });

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Role verification (Technician ownership)
    if (user.role === 'TECHNICIAN' && job.technician_id !== user.id) {
      res.status(403).json({ error: 'Not authorized to update this job' });
      return;
    }

    if (job.status === requestedStatus) {
      res.status(400).json({ error: `Job is already in ${requestedStatus} status` });
      return;
    }

    if (!isTransitionAllowed(job.status as JobStatus, requestedStatus)) {
      res.status(400).json({ error: `Invalid job status transition: ${job.status} -> ${requestedStatus}` });
      return;
    }

    const data: any = { status: requestedStatus };
    if (tech_notes) data.tech_notes = tech_notes;

    if (requestedStatus === 'ACCEPTED') data.accepted_at = new Date();
    if (requestedStatus === 'STARTED') data.started_at = new Date();
    if (requestedStatus === 'COMPLETED') data.completed_at = new Date();

    const bookingStatusUpdate = getBookingStatusForJobStatus(requestedStatus);

    await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.jobAssignment.update({
        where: { id },
        data
      });

      if (bookingStatusUpdate) {
        await tx.booking.update({
          where: { id: job.booking_id },
          data: { status: bookingStatusUpdate }
        });
      } else if (requestedStatus === 'COMPLETED') {
        // Check if all active assignments are COMPLETED
        const activeAssignments = await tx.jobAssignment.findMany({
          where: { 
            booking_id: job.booking_id,
            status: { notIn: ['REJECTED', 'CANCELLED'] }
          }
        });
        
        const allCompleted = activeAssignments.every(a => a.status === 'COMPLETED');
        if (allCompleted) {
          await tx.booking.update({
            where: { id: job.booking_id },
            data: { status: 'COMPLETED' }
          });
        }
      }
    });

    const finalJob = await prisma.jobAssignment.findUnique({ where: { id } });
    res.status(200).json(finalJob);
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
