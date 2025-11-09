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
  addParticipantToEvent,
  removeParticipantFromEvent,
  getEventDetails,
  deleteExistingEvent
} from '../controllers/adminController';
import { requireAdmin } from '../middlewares/adminAuth';

const router = Router();

router.post('/login', authenticateAdmin);
router.use(requireAdmin);
router.get('/participants', listParticipants);
router.get('/participants/:participantId', getParticipantDetails);
router.delete('/participants/:participantId', deleteParticipant);
router.post('/emails/test', triggerTestEmails);
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

export default router;
