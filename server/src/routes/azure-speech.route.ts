import { Router } from 'express';
import { getAzureSpeechToken } from '../controllers/azure-speech.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { azureSpeechTokenRateLimit } from '../middlewares/azure-speech-rate-limit.middleware.js';

const router = Router();

router.use(protect, restrictTo('admin'));
router.get('/token', azureSpeechTokenRateLimit, getAzureSpeechToken);

export default router;
