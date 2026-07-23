import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    getReadingContentSchema,
    saveReadingContentSchema,
    generateReadingSchema,
    generateReadingAudioSchema,
    fillGlossarySchema,
    generateReadingQuestionsSchema,
    getReadingQuestionsSchema,
    swapReadingQuestionSchema,
    updateReadingQuestionSchema,
    deleteReadingQuestionSchema,
} from '../validations/reading.validation.js';
import {
    getReadingContent,
    saveReadingContent,
    generateReadingContent,
    fillGlossary,
    generateReadingAudio,
    generateReadingQuestions,
    getReadingQuestions,
    swapReadingQuestion,
    updateReadingQuestion,
    deleteReadingQuestion,
} from '../controllers/reading.controller.js';

const router = Router({ mergeParams: true });

// All reading authoring routes require admin access.
router.use(protect, restrictTo('admin'));

// ─── Reading Content ──────────────────────────────────────────────────────────

router
    .route('/:lessonId/reading/content')
    .get(validate(getReadingContentSchema), getReadingContent)
    .put(validate(saveReadingContentSchema), saveReadingContent);

// ─── AI: Full Passage + Glossary Generation ───────────────────────────────────

router.post(
    '/:lessonId/reading/generate',
    validate(generateReadingSchema),
    generateReadingContent,
);

// ─── AI: Fill Missing Glossary Definitions ────────────────────────────────────

router.post(
    '/:lessonId/reading/fill-glossary',
    validate(fillGlossarySchema),
    fillGlossary,
);

// ─── Audio Generation (BullMQ enqueue) ───────────────────────────────────────

router.post(
    '/:lessonId/reading/generate-audio',
    validate(generateReadingAudioSchema),
    generateReadingAudio,
);

// ─── Practice Question Generation ────────────────────────────────────────────

router.post(
    '/:lessonId/reading/generate-questions',
    validate(generateReadingQuestionsSchema),
    generateReadingQuestions,
);

// ─── Question Review CRUD ─────────────────────────────────────────────────────

router
    .route('/:lessonId/reading/questions')
    .get(validate(getReadingQuestionsSchema), getReadingQuestions);

router
    .route('/:lessonId/reading/questions/:questionId')
    .put(validate(updateReadingQuestionSchema), updateReadingQuestion)
    .delete(validate(deleteReadingQuestionSchema), deleteReadingQuestion);

router.post(
    '/:lessonId/reading/questions/:questionId/swap',
    validate(swapReadingQuestionSchema),
    swapReadingQuestion,
);

export default router;
