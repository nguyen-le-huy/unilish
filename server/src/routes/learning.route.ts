import express from 'express';
import { LearningController } from '../controllers/learning.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    enrollCourseSchema,
    getEnrollmentsSchema,
    getDashboardSchema,
    getRoadmapSchema,
    startLessonSchema,
    getLearnerLessonSchema,
    saveCheckpointSchema,
    submitLessonSchema,
    getAttemptSchema,
} from '../validations/learning.validation.js';

const router = express.Router();

// All learning endpoints require authentication
router.use(protect);

// ─── Enrollment ────────────────────────────────────────────────────────────
router.post(
    '/courses/:courseId/enroll',
    validate(enrollCourseSchema),
    LearningController.enroll,
);

router.get(
    '/enrollments',
    validate(getEnrollmentsSchema),
    LearningController.listEnrollments,
);

// ─── Dashboard ─────────────────────────────────────────────────────────────
router.get(
    '/dashboard',
    validate(getDashboardSchema),
    LearningController.dashboard,
);

// ─── Roadmap ───────────────────────────────────────────────────────────────
router.get(
    '/courses/:slug',
    validate(getRoadmapSchema),
    LearningController.roadmap,
);

// ─── Lesson Start, Restart & Read ────────────────────────────────────────────
router.post(
    '/lessons/:lessonId/start',
    validate(startLessonSchema),
    LearningController.startLesson,
);

router.post(
    '/lessons/:lessonId/restart',
    validate(startLessonSchema),
    LearningController.restartLesson,
);

router.post(
    '/lessons/:lessonId/complete',
    validate(startLessonSchema),
    LearningController.completeLesson,
);

router.get(
    '/lessons/:lessonId',
    validate(getLearnerLessonSchema),
    LearningController.getLearnerLesson,
);

// ─── Checkpoint ───────────────────────────────────────────────────────────────
router.patch(
    '/lessons/:lessonId/checkpoint',
    validate(saveCheckpointSchema),
    LearningController.saveCheckpoint,
);

// ─── Submission ───────────────────────────────────────────────────────────────
router.post(
    '/lessons/:lessonId/submit',
    validate(submitLessonSchema),
    LearningController.submitLesson,
);

// ─── Attempt Review ──────────────────────────────────────────────────────────
router.get(
    '/attempts/:attemptId',
    validate(getAttemptSchema),
    LearningController.getAttempt,
);

export default router;
