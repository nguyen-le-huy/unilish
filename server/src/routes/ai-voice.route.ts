import express from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { aiVoiceController } from '../controllers/ai-voice.controller.js';
import {
    aiVoiceChatSchema,
    aiVoiceAssessmentSchema,
    aiVoiceSttSchema,
    aiVoiceTtsSchema,
} from '../validations/ai-voice.validation.js';
import {
    createAiVoiceTopicSchema,
    deleteAiVoiceTopicSchema,
    updateAiVoiceTopicSchema,
} from '../validations/ai-voice-content.validation.js';
import {
    aiVoiceChatRateLimit,
    aiVoiceSttRateLimit,
    aiVoiceTtsRateLimit,
} from '../middlewares/ai-voice-rate-limit.middleware.js';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 12 },
});

router.use(protect);

router.get('/catalog', aiVoiceController.getCatalog);
router.get('/admin/topics', restrictTo('admin'), aiVoiceController.getAdminTopics);
router.post('/admin/topics', restrictTo('admin'), validate(createAiVoiceTopicSchema), aiVoiceController.createTopic);
router.put('/admin/topics/:id', restrictTo('admin'), validate(updateAiVoiceTopicSchema), aiVoiceController.updateTopic);
router.delete('/admin/topics/:id', restrictTo('admin'), validate(deleteAiVoiceTopicSchema), aiVoiceController.deleteTopic);

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

export default router;
