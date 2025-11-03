import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header('x-admin-token');
  if (!token || token !== env.ADMIN_TOKEN) {
    res.status(401).json({ message: 'Acesso administrativo não autorizado.' });
    return;
  }
  next();
};
