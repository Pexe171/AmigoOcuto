import { Router } from 'express';
import { listAvailableEvents } from '../controllers/eventController';

const router = Router();

// Exibe eventos ativos para o público geral escolher durante a inscrição
router.get('/', listAvailableEvents);

export default router;
