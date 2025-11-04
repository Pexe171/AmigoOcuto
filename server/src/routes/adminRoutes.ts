import { Router } from 'express';
import {
  authenticateAdmin,
  createNewEvent,
  listAllEvents,
  cancelExistingEvent,
  runDraw,
  getHistory,
  listParticipants,
  getParticipantDetails,
  triggerTestEmails
} from '../controllers/adminController';
import { requireAdmin } from '../middlewares/adminAuth';

const router = Router();

router.post('/login', authenticateAdmin);
router.use(requireAdmin);
router.get('/participants', listParticipants);
router.get('/participants/:participantId', getParticipantDetails);
router.post('/emails/test', triggerTestEmails);
router.post('/events', createNewEvent);
router.get('/events', listAllEvents);
router.post('/events/:eventId/cancel', cancelExistingEvent);
router.post('/events/:eventId/draw', runDraw);
router.get('/events/:eventId/history', getHistory);

export default router;
