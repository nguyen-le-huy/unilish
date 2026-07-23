import express from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { speakingPipelineController } from '../controllers/speaking-pipeline.controller.js';
import {
    speakingChatSchema,
    speakingSttSchema,
    speakingTtsSchema,
} from '../validations/speaking-pipeline.validation.js';
import {
    speakingChatRateLimit,
    speakingSttRateLimit,
    speakingTtsRateLimit,
} from '../middlewares/speaking-pipeline-rate-limit.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, restrictTo('admin'));

router.post(
    '/stt',
    speakingSttRateLimit,
    upload.single('audio'),
    validate(speakingSttSchema),
    speakingPipelineController.stt,
);

router.post(
    '/chat',
    speakingChatRateLimit,
    validate(speakingChatSchema),
    speakingPipelineController.chat,
);

router.post(
    '/tts',
    speakingTtsRateLimit,
    validate(speakingTtsSchema),
    speakingPipelineController.tts,
);

export default router;
