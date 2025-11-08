import { Request, Response } from 'express';
import { listActiveEventsForRegistration } from '../services/eventService';

export const listAvailableEvents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await listActiveEventsForRegistration();
    res.json(
      events.map((event) => ({
        id: event.id,
        name: event.name,
        status: event.status,
        participantCount: event.participantCount,
        createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
      })),
    );
  } catch (error) {
    console.error('Erro ao listar eventos disponíveis:', error);
    res.status(500).json({ message: 'Não foi possível carregar os eventos disponíveis. Tente novamente em instantes.' });
  }
};
