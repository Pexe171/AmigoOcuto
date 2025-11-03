import { Router } from 'express';
import {
  createNewEvent,
  listAllEvents,
  cancelExistingEvent,
  runDraw,
  getHistory
} from '../controllers/adminController';
import { requireAdmin } from '../middlewares/adminAuth';

const router = Router();

router.use(requireAdmin);
router.post('/events', createNewEvent);
router.get('/events', listAllEvents);
router.post('/events/:eventId/cancel', cancelExistingEvent);
router.post('/events/:eventId/draw', runDraw);
router.get('/events/:eventId/history', getHistory);

export default router;
