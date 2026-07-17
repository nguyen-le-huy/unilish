import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { aiVoiceController } from '../controllers/ai-voice.controller.js';
import {
    aiVoiceChatSchema,
    aiVoiceAssessmentSchema,
    aiVoiceGenerateScenariosSchema,
    aiVoiceSttSchema,
    aiVoiceTtsSchema,
} from '../validations/ai-voice.validation.js';
import {
    aiVoiceChatRateLimit,
    aiVoiceGenerateRateLimit,
    aiVoiceSttRateLimit,
    aiVoiceTtsRateLimit,
} from '../middlewares/ai-voice-rate-limit.middleware.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 12 },
});

router.use(protect);

/**
 * @swagger
 * /api/v1/ai-voice/stt:
 *   post:
 *     summary: Transcribe user audio for AI Voice conversation
 */
router.post(
    '/stt',
    aiVoiceSttRateLimit,
    upload.single('audio'),
    validate(aiVoiceSttSchema),
    aiVoiceController.stt,
);

/**
 * @swagger
 * /api/v1/ai-voice/chat:
 *   post:
 *     summary: Stream AI Voice conversation response (SSE)
 */
router.post(
    '/chat',
    aiVoiceChatRateLimit,
    validate(aiVoiceChatSchema),
    aiVoiceController.chat,
);

router.post(
    '/assessment',
    upload.array('audio', 12),
    validate(aiVoiceAssessmentSchema),
    aiVoiceController.assessment,
);

/**
 * @swagger
 * /api/v1/ai-voice/tts:
 *   post:
 *     summary: Synthesize AI Voice assistant text to speech
 */
router.post(
    '/tts',
    aiVoiceTtsRateLimit,
    validate(aiVoiceTtsSchema),
    aiVoiceController.tts,
);

/**
 * @swagger
 * /api/v1/ai-voice/generate-scenarios:
 *   post:
 *     summary: Generate 6 AI Voice scenarios by topic and level
 */
router.post(
    '/generate-scenarios',
    aiVoiceGenerateRateLimit,
    validate(aiVoiceGenerateScenariosSchema),
    aiVoiceController.generateScenarios,
);

export default router;
