import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ExamTestController } from '../controllers/exam-test.controller.js';
import {
    analyticsExamTestSchema,
    createExamTestSchema,
    getExamTestByIdSchema,
    getExamTestsSchema,
    getVersionHistorySchema,
    parseQuestionsSchema,
    rollbackExamTestSchema,
    updateExamTestSchema,
    updateExamTestStatusSchema,
} from '../validations/exam-test.validation.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * /api/exam-tests:
 *   get:
 *     summary: List exam tests
 */
router.get('/', restrictTo('admin', 'content_creator'), validate(getExamTestsSchema), ExamTestController.getAll);

/**
 * @swagger
 * /api/exam-tests/{id}/versions:
 *   get:
 *     summary: Get exam test version history
 */
router.get(
    '/:id/versions',
    restrictTo('admin', 'content_creator'),
    validate(getVersionHistorySchema),
    ExamTestController.getVersionHistory,
);

/**
 * @swagger
 * /api/exam-tests/{id}/analytics:
 *   get:
 *     summary: Get exam test analytics
 */
router.get(
    '/:id/analytics',
    restrictTo('admin', 'content_creator'),
    validate(analyticsExamTestSchema),
    ExamTestController.getAnalytics,
);

/**
 * @swagger
 * /api/exam-tests/ai/parse-questions:
 *   post:
 *     summary: Parse question content by AI (stub)
 */
router.post(
    '/ai/parse-questions',
    restrictTo('admin'),
    validate(parseQuestionsSchema),
    ExamTestController.parseQuestions,
);

/**
 * @swagger
 * /api/exam-tests/{id}:
 *   get:
 *     summary: Get exam test by id
 */
router.get('/:id', restrictTo('admin', 'content_creator'), validate(getExamTestByIdSchema), ExamTestController.getById);

/**
 * @swagger
 * /api/exam-tests:
 *   post:
 *     summary: Create exam test
 */
router.post('/', restrictTo('admin'), validate(createExamTestSchema), ExamTestController.create);

/**
 * @swagger
 * /api/exam-tests/{id}:
 *   put:
 *     summary: Update exam test
 */
router.put('/:id', restrictTo('admin'), validate(updateExamTestSchema), ExamTestController.update);

/**
 * @swagger
 * /api/exam-tests/{id}/status:
 *   patch:
 *     summary: Update exam test status
 */
router.patch('/:id/status', restrictTo('admin'), validate(updateExamTestStatusSchema), ExamTestController.updateStatus);

/**
 * @swagger
 * /api/exam-tests/{id}/rollback/{version}:
 *   post:
 *     summary: Rollback exam test to an old version (create new draft)
 */
router.post(
    '/:id/rollback/:version',
    restrictTo('admin'),
    validate(rollbackExamTestSchema),
    ExamTestController.rollback,
);

export default router;
