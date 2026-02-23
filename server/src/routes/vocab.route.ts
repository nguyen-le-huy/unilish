import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    getVocabContentSchema,
    saveVocabContentSchema,
    generateVocabSchema,
    getVocabStatusSchema,
    regenerateAudioSchema,
    generateAllAudioSchema,
    generateQuestionsSchema,
    getVocabQuestionsSchema,
    swapVocabQuestionSchema,
    updateVocabQuestionSchema,
} from '../validations/vocab-content.validation.js';
import {
    getVocabContent,
    saveVocabContent,
    generateVocabContent,
    getGenerationStatus,
    regenerateItemAudio,
    generateAllAudio,
    getVocabQuestions,
    generateVocabQuestions,
    swapVocabQuestion,
    updateVocabQuestion,
} from '../controllers/vocab.controller.js';

const router = Router({ mergeParams: true });

// All vocab routes require authentication and content-creator / admin role
router.use(protect, restrictTo('admin', 'content_creator'));

// ─── Vocab Content ────────────────────────────────────────────────────────────

router
    .route('/:lessonId/vocab/content')
    .get(validate(getVocabContentSchema), getVocabContent)
    .put(validate(saveVocabContentSchema), saveVocabContent);

// ─── Generation ───────────────────────────────────────────────────────────────

router.post('/:lessonId/vocab/generate', validate(generateVocabSchema), generateVocabContent);

// ─── Status Polling ───────────────────────────────────────────────────────────

router.get('/:lessonId/vocab/status', validate(getVocabStatusSchema), getGenerationStatus);

// ─── Per-Item Audio Regeneration ──────────────────────────────────────────────

router.post(
    '/:lessonId/vocab/items/:itemId/regenerate-audio',
    validate(regenerateAudioSchema),
    regenerateItemAudio,
);

// ─── Generate All Audio ───────────────────────────────────────────────────────

router.post(
    '/:lessonId/vocab/generate-audio',
    validate(generateAllAudioSchema),
    generateAllAudio,
);

// ─── Practice Questions ───────────────────────────────────────────────────────

router
    .route('/:lessonId/vocab/questions')
    .get(validate(getVocabQuestionsSchema), getVocabQuestions);

router.post(
    '/:lessonId/vocab/generate-questions',
    validate(generateQuestionsSchema),
    generateVocabQuestions,
);

router
    .route('/:lessonId/vocab/questions/:questionId')
    .put(validate(updateVocabQuestionSchema), updateVocabQuestion);

router.post(
    '/:lessonId/vocab/questions/:questionId/swap',
    validate(swapVocabQuestionSchema),
    swapVocabQuestion,
);

export default router;
