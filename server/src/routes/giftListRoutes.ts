import { Router } from 'express';
import {
  getParticipantGiftList,
  updateParticipantGiftList,
  getAssignedFriend,
} from '../controllers/giftListController';
import { requireParticipantAuth } from '../middlewares/participantAuth';

const router = Router();

// Toda rota daqui exige autenticação de participante (cookie HTTP-only)
router.use(requireParticipantAuth);

router.get('/:participantId/assigned-friend', getAssignedFriend); // Mostra quem você tirou
router.get('/:participantId', getParticipantGiftList); // Retorna os itens cadastrados
router.put('/:participantId', updateParticipantGiftList); // Atualiza a lista completa

export default router;
