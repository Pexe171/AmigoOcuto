import { Router } from 'express';
import { listAvailableEvents } from '../controllers/eventController';

const router = Router();

router.get('/', listAvailableEvents);

export default router;
