import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    getGrammarContentSchema,
    saveGrammarContentSchema,
    generateGrammarStorySchema,
    generateGrammarQuestionsSchema,
    generateGrammarAudioSchema,
    getGrammarQuestionsSchema,
    swapGrammarQuestionSchema,
    updateGrammarQuestionSchema,
    deleteGrammarQuestionSchema,
} from '../validations/grammar.validation.js';
import {
    getGrammarContent,
    saveGrammarContent,
    generateGrammarStory,
    generateGrammarQuestions,
    generateGrammarAudio,
    getGrammarQuestions,
    swapGrammarQuestion,
    updateGrammarQuestion,
    deleteGrammarQuestion,
} from '../controllers/grammar.controller.js';

const router = Router({ mergeParams: true });

// All grammar routes require authentication + content creator / admin role
router.use(protect, restrictTo('admin', 'content_creator'));

// ─── Grammar Content ──────────────────────────────────────────────────────────

router
    .route('/:lessonId/grammar/content')
    .get(validate(getGrammarContentSchema), getGrammarContent)
    .put(validate(saveGrammarContentSchema), saveGrammarContent);

// ─── AI Story Generation ──────────────────────────────────────────────────────

router.post(
    '/:lessonId/grammar/generate-story',
    validate(generateGrammarStorySchema),
    generateGrammarStory,
);

// ─── Practice Question Generation ────────────────────────────────────────────

router.post(
    '/:lessonId/grammar/generate-questions',
    validate(generateGrammarQuestionsSchema),
    generateGrammarQuestions,
);

// ─── Audio Generation ────────────────────────────────────────────────────────────────────

router.post(
    '/:lessonId/grammar/generate-audio',
    validate(generateGrammarAudioSchema),
    generateGrammarAudio,
);

// ─── Question Review CRUD ────────────────────────────────────────────────────────────

router
    .route('/:lessonId/grammar/questions')
    .get(validate(getGrammarQuestionsSchema), getGrammarQuestions);

router
    .route('/:lessonId/grammar/questions/:questionId')
    .put(validate(updateGrammarQuestionSchema), updateGrammarQuestion)
    .delete(validate(deleteGrammarQuestionSchema), deleteGrammarQuestion);

router.post(
    '/:lessonId/grammar/questions/:questionId/swap',
    validate(swapGrammarQuestionSchema),
    swapGrammarQuestion,
);

export default router;
