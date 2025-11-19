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
  getCurrentParticipant,
  logoutParticipant,
} from '../controllers/participantController';
import { requireParticipantAuth } from '../middlewares/participantAuth';

const router = Router();

/**
 * Rotas públicas e autenticadas relacionadas ao ciclo de vida dos participantes.
 * Todas as mensagens e comentários foram escritos em português para manter a
 * proximidade com o público alvo da aplicação.
 */

router.post('/', createParticipant); // Inicia a inscrição e envia código de verificação
router.post('/verify', confirmParticipant); // Conclui a verificação usando ID + código
router.post('/login', authenticateParticipant); // Abre a sessão protegida do painel de listas
router.post('/logout', logoutParticipant); // Encerra a sessão atual removendo o cookie
router.post('/request-verification-code', requestVerificationCode); // Reenvia código temporário
router.put('/update-email', updateEmail); // Atualiza o e-mail da inscrição pendente
router.get('/search', searchParticipantsByName); // Busca por nome para uso administrativo
router.get('/by-email/:email', getParticipantStatusByEmail); // Verifica status pelo e-mail
router.post('/:id/resend', resendVerification); // Reenvia o código para um ID específico
router.get('/me', requireParticipantAuth, getCurrentParticipant); // Retorna dados da sessão ativa
router.get('/:id', getParticipantStatus); // Mostra status completo de qualquer participante

export default router;
