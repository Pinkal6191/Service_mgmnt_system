import { Request, Response } from 'express';
import prisma from '../config/prisma';

// --- Cities ---
export const createCity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const city = await prisma.city.create({ data: { name } });
    res.status(201).json(city);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create city' });
  }
};

export const getCities = async (req: Request, res: Response): Promise<void> => {
  try {
    const cities = await prisma.city.findMany({ where: { is_active: true } });
    res.status(200).json(cities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
};

// --- Branches ---
export const createBranch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city_id, name, address, contact_number, admin_id } = req.body;
    const branch = await prisma.branch.create({
      data: { city_id, name, address, contact_number, admin_id }
    });
    res.status(201).json(branch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create branch' });
  }
};

export const getBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const branches = await prisma.branch.findMany({
      where: { is_active: true },
      include: { city: true, admin: { select: { id: true, full_name: true, email: true } } }
    });
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
};
