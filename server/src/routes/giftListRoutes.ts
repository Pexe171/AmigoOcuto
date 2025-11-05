// Este ficheiro deve estar em server/src/routes/giftListRoutes.ts
import { Router } from 'express';
import {
  updateGiftList,
  fetchGiftList,
  updateGiftListByEmail,
  fetchGiftListByEmail,
} from '../controllers/giftListController';

// { mergeParams: true } é importante para que esta rota
// consiga aceder ao :participantId vindo do ficheiro server/src/app.ts
const router = Router({ mergeParams: true });

// PUT /api/participants/:participantId/gifts
router.put('/', updateGiftList);

// GET /api/participants/:participantId/gifts
router.get('/', fetchGiftList);

export default router;

// Rotas para buscar por email
export const giftListByEmailRouter = Router();

// PUT /api/participants/by-email/:email/gifts
giftListByEmailRouter.put('/:email/gifts', updateGiftListByEmail);

// GET /api/participants/by-email/:email/gifts
giftListByEmailRouter.get('/:email/gifts', fetchGiftListByEmail);
