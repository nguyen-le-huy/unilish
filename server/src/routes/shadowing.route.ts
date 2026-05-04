import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ShadowingController } from '../controllers/shadowing.controller.js';
import {
    listVideosSchema,
    scorePronunciationSchema,
    submitVideoSchema,
    videoIdParamSchema,
} from '../validations/shadowing.schema.js';
import { shadowingSubmitRateLimit } from '../middlewares/shadowing-rate-limit.middleware.js';

const router = express.Router();
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

/**
 * @swagger
 * /api/v1/shadowing/videos:
 *   post:
 *     summary: Submit a YouTube video URL for shadowing processing
 */
router.post('/videos', shadowingSubmitRateLimit, validate(submitVideoSchema), ShadowingController.submitVideo);

/**
 * @swagger
 * /api/v1/shadowing/videos/{videoId}/status:
 *   get:
 *     summary: Get processing status for a shadowing video
 */
router.get('/videos/:videoId/status', validate(videoIdParamSchema), ShadowingController.getVideoStatus);

/**
 * @swagger
 * /api/v1/shadowing/videos:
 *   get:
 *     summary: List paginated processed shadowing videos
 */
router.get('/videos', validate(listVideosSchema), ShadowingController.listVideos);

/**
 * @swagger
 * /api/v1/shadowing/pronunciation/score:
 *   post:
 *     summary: Score pronunciation for a recorded cue
 */
router.post(
    '/pronunciation/score',
    audioUpload.single('audio'),
    validate(scorePronunciationSchema),
    ShadowingController.scorePronunciation,
);

export default router;
