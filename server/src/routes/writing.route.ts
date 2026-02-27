import { Router } from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    getWritingContentSchema,
    saveWritingContentSchema,
    generateWritingMissionSchema,
    testDriveGradeSchema,
} from '../validations/writing.validation.js';
import {
    getWritingContent,
    saveWritingContent,
    generateWritingMission,
    testDriveGrade,
} from '../controllers/writing.controller.js';

const router = Router({ mergeParams: true });

// All writing routes require authentication + content creator / admin role
router.use(protect, restrictTo('admin', 'content_creator'));

// ─── Writing Content ──────────────────────────────────────────────────────────

router
    .route('/:lessonId/writing/content')
    .get(validate(getWritingContentSchema), getWritingContent)
    .put(validate(saveWritingContentSchema), saveWritingContent);

// ─── AI: Full Prompt + Model Answer + Rubric Generation ──────────────────────

router.post(
    '/:lessonId/writing/generate-mission',
    validate(generateWritingMissionSchema),
    generateWritingMission,
);

router.post(
    '/:lessonId/writing/generate',
    validate(generateWritingMissionSchema),
    generateWritingMission,
);

router.post(
    '/:lessonId/writing/test-drive-grade',
    validate(testDriveGradeSchema),
    testDriveGrade,
);

export default router;
