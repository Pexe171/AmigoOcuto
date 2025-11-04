// Este ficheiro deve estar em server/src/routes/participantRoutes.ts
import { Router } from 'express';
import {
  createParticipant,
  confirmParticipant,
  resendVerification,
  getParticipantStatus,
  searchParticipantsByName,
} from '../controllers/participantController';

const router = Router();

// POST /api/participants -> chama a função createParticipant
router.post('/', createParticipant);

// POST /api/participants/verify -> chama a função confirmParticipant
router.post('/verify', confirmParticipant);

// POST /api/participants/:id/resend -> chama a função resendVerification
router.post('/:id/resend', resendVerification);

// GET /api/participants/search -> pesquisa participantes pelo nome
router.get('/search', searchParticipantsByName);

// GET /api/participants/:id -> chama a função getParticipantStatus
router.get('/:id', getParticipantStatus);

export default router;
