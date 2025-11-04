import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';
import jwt from 'jsonwebtoken';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.header('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Acesso administrativo não autorizado.' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  try {
    jwt.verify(token, env.ADMIN_JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Sessão administrativa inválida ou expirada.' });
  }
};
