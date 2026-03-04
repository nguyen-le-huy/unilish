import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { QuestionController } from '../controllers/question.controller.js';
import {
    getQuestionsSchema,
    getQuestionByIdSchema,
    createQuestionSchema,
    updateQuestionSchema,
    updateQuestionStatusSchema,
    bulkActionSchema,
    exportQuestionsSchema,
} from '../validations/question.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── Public GET (read-only for authenticated users) ──────────────────────────

// ⚠️ Static routes MUST be registered before /:id to prevent conflict
router.get(
    '/export',
    restrictTo('admin', 'content_creator'),
    validate(exportQuestionsSchema),
    QuestionController.exportQuestions,
);

router.get('/', validate(getQuestionsSchema), QuestionController.getQuestions);
router.get('/:id', validate(getQuestionByIdSchema), QuestionController.getQuestionById);

// ─── Mutation routes (admin / content_creator only) ──────────────────────────

router.post(
    '/',
    restrictTo('admin', 'content_creator'),
    validate(createQuestionSchema),
    QuestionController.createQuestion,
);

// ⚠️ /bulk MUST be registered before /:id
router.post(
    '/bulk',
    restrictTo('admin', 'content_creator'),
    validate(bulkActionSchema),
    QuestionController.bulkAction,
);

router.put(
    '/:id',
    restrictTo('admin', 'content_creator'),
    validate(updateQuestionSchema),
    QuestionController.updateQuestion,
);

router.patch(
    '/:id/status',
    restrictTo('admin', 'content_creator'),
    validate(updateQuestionStatusSchema),
    QuestionController.updateQuestionStatus,
);

router.delete(
    '/:id',
    restrictTo('admin', 'content_creator'),
    validate(getQuestionByIdSchema),
    QuestionController.deleteQuestion,
);

export default router;
