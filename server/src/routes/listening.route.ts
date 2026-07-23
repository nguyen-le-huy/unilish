import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    getListeningContentSchema,
    saveListeningContentSchema,
    generateListeningScriptSchema,
    mixAndSyncSchema,
    cancelMixAndSyncSchema,
    getSyncStatusSchema,
    generateListeningQuestionsSchema,
    getListeningQuestionsSchema,
    swapListeningQuestionSchema,
    updateListeningQuestionSchema,
    deleteListeningQuestionSchema,
} from '../validations/listening.validation.js';
import {
    getListeningContent,
    saveListeningContent,
    generateListeningQuestions,
    getListeningQuestions,
    swapListeningQuestion,
    updateListeningQuestion,
    deleteListeningQuestion,
} from '../controllers/listening.controller.js';
import {
    generateListeningScript,
    mixAndSync,
    cancelMixAndSync,
    getListeningSyncStatus,
} from '../controllers/listening-ai.controller.js';

// mergeParams: true — inherits :lessonId if this router is mounted on a parent
const router = Router({ mergeParams: true });

// All other listening authoring routes require admin access.
router.use(protect, restrictTo('admin'));

// ─── Listening Content ────────────────────────────────────────────────────────

router
    .route('/:lessonId/listening/content')
    .get(validate(getListeningContentSchema), getListeningContent)
    .put(validate(saveListeningContentSchema), saveListeningContent);

// ─── AI Pipeline ──────────────────────────────────────────────────────────────

router.post(
    '/:lessonId/listening/generate-script',
    validate(generateListeningScriptSchema),
    generateListeningScript,
);

router.post(
    '/:lessonId/listening/mix-and-sync',
    validate(mixAndSyncSchema),
    mixAndSync,
);

router.delete(
    '/:lessonId/listening/mix-and-sync',
    validate(cancelMixAndSyncSchema),
    cancelMixAndSync,
);

router.get(
    '/:lessonId/listening/sync-status',
    validate(getSyncStatusSchema),
    getListeningSyncStatus,
);

// ─── Practice Questions ─────────────────────────────────────────────────────

router.post(
    '/:lessonId/listening/generate-questions',
    validate(generateListeningQuestionsSchema),
    generateListeningQuestions,
);

router.get(
    '/:lessonId/listening/questions',
    validate(getListeningQuestionsSchema),
    getListeningQuestions,
);

router
    .route('/:lessonId/listening/questions/:questionId')
    .put(validate(updateListeningQuestionSchema), updateListeningQuestion)
    .delete(validate(deleteListeningQuestionSchema), deleteListeningQuestion);

router.post(
    '/:lessonId/listening/questions/:questionId/swap',
    validate(swapListeningQuestionSchema),
    swapListeningQuestion,
);

export default router;
