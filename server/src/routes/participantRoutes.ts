import { Router } from 'express';
import {
  createParticipant,
  confirmParticipant,
  resendVerification,
  getParticipantStatus
} from '../controllers/participantController';

const router = Router();

router.post('/', createParticipant);
router.post('/verify', confirmParticipant);
router.post('/:id/resend', resendVerification);
router.get('/:id', getParticipantStatus);

export default router;
