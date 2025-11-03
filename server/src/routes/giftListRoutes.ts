import { Router } from 'express';
import { updateGiftList, fetchGiftList } from '../controllers/giftListController';

const router = Router({ mergeParams: true });

router.put('/', updateGiftList);
router.get('/', fetchGiftList);

export default router;
