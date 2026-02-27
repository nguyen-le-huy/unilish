import express from 'express';
import { LessonController } from '../controllers/lesson.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createLessonSchema,
    deleteLessonSchema,
    getLessonByIdSchema,
    getLessonsByUnitIdSchema,
    reorderLessonsSchema,
    updateLessonSchema,
} from '../validations/lesson.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

import speakingRouter from './speaking.route.js';
router.use('/:lessonId/speaking', speakingRouter);

// ─── Read ────────────────────────────────────────────────────────────────────
router.get('/', validate(getLessonsByUnitIdSchema), LessonController.getLessonsByUnitId);
router.get('/:lessonId', validate(getLessonByIdSchema), LessonController.getLessonById);

// ─── Reorder (admin & content_creator) — before /:lessonId to avoid param clash
router.patch(
    '/reorder',
    restrictTo('admin', 'content_creator'),
    validate(reorderLessonsSchema),
    LessonController.reorderLessons,
);

// ─── Write ────────────────────────────────────────────────────────────────────
router.post(
    '/',
    restrictTo('admin', 'content_creator'),
    validate(createLessonSchema),
    LessonController.createLesson,
);
router.put(
    '/:lessonId',
    restrictTo('admin', 'content_creator'),
    validate(updateLessonSchema),
    LessonController.updateLesson,
);
router.delete(
    '/:lessonId',
    restrictTo('admin'),
    validate(deleteLessonSchema),
    LessonController.deleteLesson,
);

export default router;
