import { Request, Response } from 'express';
import prisma from '../config/prisma';

// --- Service Categories ---
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const category = await prisma.serviceCategory.create({ data: { name, description } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.serviceCategory.findMany();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// --- Services ---
export const createService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category_id, name, description, base_price } = req.body;
    const service = await prisma.service.create({
      data: { category_id, name, description, base_price }
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
};

export const getServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category_id } = req.query;
    
    const whereClause: any = { is_active: true };
    if (category_id) whereClause.category_id = category_id as string;

    const services = await prisma.service.findMany({
      where: whereClause,
      include: { category: true }
    });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};
