// Este ficheiro deve estar em server/src/routes/participantRoutes.ts
import { Router } from 'express';
import {
  createParticipant,
  confirmParticipant,
  resendVerification,
  getParticipantStatus,
  searchParticipantsByName,
  getParticipantStatusByEmail,
  updateEmail,
  authenticateParticipant,
  requestVerificationCode,
} from '../controllers/participantController';

const router = Router();

// POST /api/participants -> chama a funÃ§Ã£o createParticipant
router.post('/', createParticipant);

// POST /api/participants/verify -> chama a funÃ§Ã£o confirmParticipant
router.post('/verify', confirmParticipant);

// POST /api/participants/login -> autentica o participante e retorna um token
router.post('/login', authenticateParticipant);

// POST /api/participants/request-verification-code -> envia código para login/confirmacao
router.post('/request-verification-code', requestVerificationCode);

// PUT /api/participants/update-email -> atualiza o email e reenvia cÃ³digo
router.put('/update-email', updateEmail);

// GET /api/participants/search -> pesquisa participantes pelo nome
router.get('/search', searchParticipantsByName);

// GET /api/participants/by-email/:email -> chama a funÃ§Ã£o getParticipantStatusByEmail
router.get('/by-email/:email', getParticipantStatusByEmail);

// POST /api/participants/:id/resend -> chama a funÃ§Ã£o resendVerification
router.post('/:id/resend', resendVerification);

// GET /api/participants/:id -> chama a funÃ§Ã£o getParticipantStatus
router.get('/:id', getParticipantStatus);

export default router;

