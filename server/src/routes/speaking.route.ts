import express from 'express';
import { speakingController } from '../controllers/speaking.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    getSpeakingRealtimeSessionSchema,
    getSpeakingContentSchema,
    saveSpeakingContentSchema,
    generateSpeakingMissionSchema,
    testSpeakingCoachSchema,
} from '../validations/speaking.validation.js';

const router = express.Router({ mergeParams: true });

// Tích hợp route dạng: /api/admin/lessons/:lessonId/speaking

router.use(protect);

router.get(
    '/session',
    validate(getSpeakingRealtimeSessionSchema),
    speakingController.getSpeakingRealtimeSession,
);

router.get(
    '/content',
    validate(getSpeakingContentSchema),
    speakingController.getSpeakingContent,
);

router.put(
    '/content',
    restrictTo('admin'),
    validate(saveSpeakingContentSchema),
    speakingController.saveSpeakingContent,
);

router.post(
    '/generate-mission',
    restrictTo('admin'),
    validate(generateSpeakingMissionSchema),
    speakingController.generateSpeakingMission,
);

router.post(
    '/test-coach',
    restrictTo('admin'),
    validate(testSpeakingCoachSchema),
    speakingController.testSpeakingCoach,
);

export default router;
