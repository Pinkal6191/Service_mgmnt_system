import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const upsertSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save setting' });
  }
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany();
    // Convert array of {key, value} to an object for easier frontend parsing
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    
    res.status(200).json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};
