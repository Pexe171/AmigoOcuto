import { Router } from 'express';
import {
  authenticateAdmin,
  createNewEvent,
  listAllEvents,
  cancelExistingEvent,
  runDraw,
  undoDraw,
  getHistory,
  listParticipants,
  getParticipantDetails,
  deleteParticipant,
  triggerTestEmails,
  triggerGiftListWarningEmails,
  triggerGiftListWarningEmailsForEvent,
  addParticipantToEvent,
  removeParticipantFromEvent,
  getEventDetails,
  deleteExistingEvent,
  resetDatabaseData,
  exportParticipants,
  importParticipants,
} from '../controllers/adminController';
import { requireAdmin } from '../middlewares/adminAuth';

const router = Router();

router.post('/login', authenticateAdmin);
router.use(requireAdmin);

// A partir daqui todas as rotas exigem token válido do painel administrativo
router.get('/participants', listParticipants);
router.post('/participants/import', importParticipants);
router.get('/participants/export', exportParticipants);
router.get('/participants/:participantId', getParticipantDetails);
router.delete('/participants/:participantId', deleteParticipant);
router.post('/emails/test', triggerTestEmails);
router.post('/emails/gift-list-warning', triggerGiftListWarningEmails);
router.post('/events/:eventId/emails/gift-list-warning', triggerGiftListWarningEmailsForEvent);
router.post('/events', createNewEvent);
router.get('/events', listAllEvents);
router.post('/events/:eventId/cancel', cancelExistingEvent);
router.post('/events/:eventId/draw', runDraw);
router.post('/events/:eventId/undo-draw', undoDraw);
router.get('/events/:eventId/history', getHistory);
router.get('/events/:eventId', getEventDetails);
router.post('/events/:eventId/participants/:participantId', addParticipantToEvent);
router.delete('/events/:eventId/participants/:participantId', removeParticipantFromEvent);
router.delete('/events/:eventId', deleteExistingEvent);
router.delete('/database', resetDatabaseData);

export default router;
