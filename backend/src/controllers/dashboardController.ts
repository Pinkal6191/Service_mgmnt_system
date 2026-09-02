import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const getMasterDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalCustomers = await prisma.user.count({ where: { role: 'CUSTOMER' } });
    const totalTechnicians = await prisma.user.count({ where: { role: 'TECHNICIAN' } });
    const totalBranches = await prisma.branch.count({ where: { is_active: true } });
    const pendingServices = await prisma.jobAssignment.count({ where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'STARTED'] } } });
    const completedServices = await prisma.jobAssignment.count({ where: { status: 'COMPLETED' } });
    
    // Revenue Summary
    const invoices = await prisma.invoice.findMany({ where: { status: 'PAID' } });
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.final_amount), 0);

    res.status(200).json({
      totalCustomers,
      totalTechnicians,
      totalBranches,
      pendingServices,
      completedServices,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load master dashboard' });
  }
};

export const getBranchDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const branch_id = user.branch_id;

    if (!branch_id) {
      res.status(400).json({ error: 'Admin is not assigned to a branch' });
      return;
    }

    const pendingServices = await prisma.jobAssignment.count({
      where: { 
        status: { in: ['ASSIGNED', 'ACCEPTED', 'STARTED'] },
        booking: { branch_id }
      }
    });

    const completedServices = await prisma.jobAssignment.count({
      where: { 
        status: 'COMPLETED',
        booking: { branch_id }
      }
    });

    res.status(200).json({
      pendingServices,
      completedServices
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load branch dashboard' });
  }
};
