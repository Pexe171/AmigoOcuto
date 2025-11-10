import { Request, Response } from 'express';
import { listActiveEventsForRegistration } from '../services/eventService';
import { logger } from '../observability/logger';

export const listAvailableEvents = async (_req: Request, res: Response): Promise<void> => {
  try {
    const events = await listActiveEventsForRegistration();
    res.json(
      events.map((event) => ({
        id: event.id,
        name: event.name,
        location: event.location,
        status: event.status,
        participantCount: event.participantCount,
        createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
      })),
    );
  } catch (error) {
    logger.error({ event: 'events:list-available-error', error }, 'Erro ao listar eventos disponíveis');
    res.status(500).json({ message: 'Não foi possível carregar os eventos disponíveis. Tente novamente em instantes.' });
  }
};
