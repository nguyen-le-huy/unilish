import express from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ShadowingController } from '../controllers/shadowing.controller.js';
import {
    listVideosSchema,
    scorePronunciationSchema,
    submitVideoSchema,
    updateCuesSchema,
    videoIdParamSchema,
} from '../validations/shadowing.schema.js';
import { shadowingSubmitRateLimit } from '../middlewares/shadowing-rate-limit.middleware.js';

const router = express.Router();
const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

/**
 * @swagger
 * /api/v1/shadowing/admin/videos:
 *   post:
 *     summary: Submit a YouTube video URL for shadowing processing
 */
router.post(
    '/admin/videos',
    restrictTo('admin'),
    shadowingSubmitRateLimit,
    validate(submitVideoSchema),
    ShadowingController.submitVideo,
);

router.get(
    '/admin/videos',
    restrictTo('admin'),
    validate(listVideosSchema),
    ShadowingController.listAdminVideos,
);

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
 * /api/v1/shadowing/admin/videos/{videoId}/cues:
 *   patch:
 *     summary: Update shadowing cues for a video
 */
router.patch(
    '/admin/videos/:videoId/cues',
    restrictTo('admin'),
    validate(updateCuesSchema),
    ShadowingController.updateCues,
);

router.delete(
    '/admin/videos/:videoId',
    restrictTo('admin'),
    validate(videoIdParamSchema),
    ShadowingController.deleteVideo,
);

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
