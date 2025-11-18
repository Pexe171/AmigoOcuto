import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findParticipantById } from '../database/participantRepository';
import { secretManager } from '../security/secretManager';

interface ParticipantTokenPayload extends jwt.JwtPayload {
  participantId: string; // Stored as string in JWT
  email?: string;
}

export const requireParticipantAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  // Primeiro tenta pegar do header Authorization
  const authorization = req.header('authorization');
  if (authorization && authorization.startsWith('Bearer ')) {
    token = authorization.slice('Bearer '.length).trim();
  }

  // Se não encontrou no header, tenta pegar do cookie
  if (!token) {
    token = req.cookies?.participant_token;
  }

  if (!token) {
    res.status(401).json({ message: 'Acesso não autorizado. Token não fornecido.' });
    return;
  }
  try {
    const decoded = jwt.verify(token, secretManager.getSecret('ADMIN_JWT_SECRET')) as ParticipantTokenPayload;
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
  } catch {
    res.status(401).json({ message: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
};
