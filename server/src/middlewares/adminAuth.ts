import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { secretManager } from '../security/secretManager';
import { recordAuthEvent } from '../security/auditService';

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.header('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    recordAuthEvent({ subject: 'admin', outcome: 'failure', reason: 'missing_token' });
    res.status(401).json({ message: 'Acesso administrativo não autorizado.' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  try {
    jwt.verify(token, secretManager.getSecret('ADMIN_JWT_SECRET'));
    next();
  } catch {
    recordAuthEvent({ subject: 'admin', outcome: 'failure', reason: 'invalid_token' });
    res.status(401).json({ message: 'Sessão administrativa inválida ou expirada.' });
  }
};
