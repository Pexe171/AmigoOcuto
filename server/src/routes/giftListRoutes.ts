// Este ficheiro deve estar em server/src/routes/giftListRoutes.ts
import { Router } from 'express';
import {
  getParticipantGiftList, // Changed from fetchGiftList
  updateParticipantGiftList, // Changed from updateGiftList
  getAssignedFriend,
} from '../controllers/giftListController';
import { requireParticipantAuth } from '../middlewares/participantAuth';

const router = Router(); // Removed { mergeParams: true } as we'll define full paths here

router.use(requireParticipantAuth); // Apply auth middleware to all routes in this router

// GET /api/gift-lists/:participantId/assigned-friend
router.get('/:participantId/assigned-friend', getAssignedFriend);

// GET /api/gift-lists/:participantId
router.get('/:participantId', getParticipantGiftList);

// PUT /api/gift-lists/:participantId
router.put('/:participantId', updateParticipantGiftList);

export default router;
