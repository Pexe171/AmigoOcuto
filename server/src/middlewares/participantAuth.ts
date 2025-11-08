import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment';
import jwt from 'jsonwebtoken';
import { findParticipantById } from '../database/participantRepository';

// Extend the Request type to include participantId
declare global {
  namespace Express {
    interface Request {
      participantId?: string;
    }
  }
}

interface ParticipantTokenPayload extends jwt.JwtPayload {
  participantId: string; // Stored as string in JWT
  email?: string;
}

export const requireParticipantAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authorization = req.header('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' });
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET) as ParticipantTokenPayload; // Reusing ADMIN_JWT_SECRET
    if (!decoded.participantId || typeof decoded.participantId !== 'string') {
      res.status(401).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
      return;
    }

    const participantId = decoded.participantId.trim();
    if (!participantId) {
      res.status(401).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
      return;
    }

    req.participantId = participantId;

    const participant = findParticipantById(participantId);

    if (!participant) {
      res.status(404).json({ message: 'Participante não encontrado.' });
      return;
    }

    if (!participant.emailVerified) {
      res.status(403).json({ message: 'Email não verificado. Por favor, verifique seu email para continuar.' });
      return;
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
};
