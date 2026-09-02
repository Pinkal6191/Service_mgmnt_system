import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, phone, role, branch_id } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists with this email.' });
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash,
        full_name,
        phone,
        role: role as Role,
        branch_id
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        branch_id: true,
        created_at: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, branch_id } = req.query;
    
    const whereClause: any = { is_active: true };
    if (role) whereClause.role = role as Role;
    if (branch_id) whereClause.branch_id = branch_id as string;

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        role: true,
        branch_id: true,
        is_active: true
      }
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
