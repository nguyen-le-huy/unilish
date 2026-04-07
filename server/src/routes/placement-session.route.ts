import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { PlacementSessionController } from '../controllers/placement-session.controller.js';
import {
    createPlacementSessionSchema,
    getSpeakingResultSchema,
    placementSessionParamsSchema,
    startWritingAttemptSchema,
    submitSpeakingAttemptSchema,
    submitWritingAttemptSchema,
    uploadSpeakingAudioChunkSchema,
} from '../validations/placement-session.validation.js';

const router = express.Router();

const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 30 * 1024 * 1024,
    },
});

router.use(protect);

router.post('/', validate(createPlacementSessionSchema), PlacementSessionController.createSession);

router.post(
    '/:sessionId/writing/start',
    validate(startWritingAttemptSchema),
    PlacementSessionController.startWritingAttempt,
);

router.post(
    '/:sessionId/writing/submit',
    validate(submitWritingAttemptSchema),
    PlacementSessionController.submitWritingAttempt,
);

router.get(
    '/:sessionId/writing/result',
    validate(placementSessionParamsSchema),
    PlacementSessionController.getWritingResult,
);

router.post(
    '/:sessionId/speaking/start',
    validate(placementSessionParamsSchema),
    PlacementSessionController.startSpeakingAttempt,
);

router.post(
    '/:sessionId/speaking/audio-chunk',
    audioUpload.single('audio'),
    validate(uploadSpeakingAudioChunkSchema),
    PlacementSessionController.uploadSpeakingAudioChunk,
);

router.post(
    '/:sessionId/speaking/submit',
    validate(submitSpeakingAttemptSchema),
    PlacementSessionController.submitSpeakingAttempt,
);

router.get(
    '/:sessionId/speaking/result',
    validate(getSpeakingResultSchema),
    PlacementSessionController.getSpeakingResult,
);

router.get(
    '/:sessionId/result',
    validate(placementSessionParamsSchema),
    PlacementSessionController.getPlacementResult,
);

export default router;
