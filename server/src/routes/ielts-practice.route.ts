import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ieltsStartRateLimit, ieltsSubmitRateLimit, ieltsDraftRateLimit } from '../middlewares/ielts-rate-limit.middleware.js';
import { IeltsPracticeController } from '../controllers/ielts-practice.controller.js';
import { IeltsAttemptController } from '../controllers/ielts-attempt.controller.js';
import {
    ieltsSummarySchema,
    ieltsListTestsSchema,
    ieltsTestDetailSchema,
} from '../validations/ielts-practice.validation.js';
import {
    startAttemptSchema,
    getAttemptSchema,
    saveDraftSchema,
    submitAttemptSchema,
    abandonAttemptSchema,
    getAttemptResultSchema,
} from '../validations/ielts-attempt.validation.js';

const router = express.Router();

// All learner-facing IELTS practice endpoints require authentication
router.use(protect);

// ─── Content endpoints (Phase 1) ────────────────────────────────────────────

router.get('/summary', validate(ieltsSummarySchema), IeltsPracticeController.getSkillSummary);

router.get('/tests', validate(ieltsListTestsSchema), IeltsPracticeController.getTestsBySkill);

router.get('/tests/:slug', validate(ieltsTestDetailSchema), IeltsPracticeController.getTestDetail);

// ─── Attempt endpoints (Phase 2) ────────────────────────────────────────────

/**
 * POST /api/ielts-practice/tests/:testId/attempts
 * Start a new attempt. Requires Idempotency-Key header.
 * Rate-limited: 10 requests/60s per user.
 */
router.post(
    '/tests/:testId/attempts',
    ieltsStartRateLimit,
    validate(startAttemptSchema),
    IeltsAttemptController.startAttempt,
);

/**
 * GET /api/ielts-practice/attempts/:attemptId
 * Get attempt detail (resume, reload).
 */
router.get(
    '/attempts/:attemptId',
    validate(getAttemptSchema),
    IeltsAttemptController.getAttempt,
);

/**
 * PATCH /api/ielts-practice/attempts/:attemptId/draft
 * Autosave draft with revision control.
 * Rate-limited: 60 requests/60s per user.
 */
router.patch(
    '/attempts/:attemptId/draft',
    ieltsDraftRateLimit,
    validate(saveDraftSchema),
    IeltsAttemptController.saveDraft,
);

/**
 * POST /api/ielts-practice/attempts/:attemptId/submit
 * Submit attempt. Requires Idempotency-Key header.
 * Rate-limited: 10 requests/60s per user.
 */
router.post(
    '/attempts/:attemptId/submit',
    ieltsSubmitRateLimit,
    validate(submitAttemptSchema),
    IeltsAttemptController.submitAttempt,
);

/**
 * POST /api/ielts-practice/attempts/:attemptId/abandon
 * Abandon attempt (idempotent).
 */
router.post(
    '/attempts/:attemptId/abandon',
    validate(abandonAttemptSchema),
    IeltsAttemptController.abandonAttempt,
);

/**
 * GET /api/ielts-practice/attempts/:attemptId/result
 * Get attempt result.
 */
router.get(
    '/attempts/:attemptId/result',
    validate(getAttemptResultSchema),
    IeltsAttemptController.getAttemptResult,
);

export default router;
