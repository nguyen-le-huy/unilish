import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { PlacementTestController } from '../controllers/placement-test.controller.js';
import {
    getPlacementTestsSchema,
    getPlacementTestByIdSchema,
    createPlacementTestSchema,
    updatePlacementTestSchema,
    updatePlacementTestStatusSchema,
    getVersionHistorySchema,
    rollbackSchema,
    poolValidationSchema,
    analyticsSchema,
} from '../validations/placement-test.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── Read routes ──────────────────────────────────────────────────────────────

router.get(
    '/',
    restrictTo('admin', 'content_creator'),
    validate(getPlacementTestsSchema),
    PlacementTestController.getAll,
);

// ⚠️ Static sub-routes MUST be registered before /:id
router.get(
    '/:id/versions',
    restrictTo('admin', 'content_creator'),
    validate(getVersionHistorySchema),
    PlacementTestController.getVersionHistory,
);

router.get(
    '/:id/pool-validation',
    restrictTo('admin', 'content_creator'),
    validate(poolValidationSchema),
    PlacementTestController.validatePool,
);

router.get(
    '/:id/analytics',
    restrictTo('admin', 'content_creator'),
    validate(analyticsSchema),
    PlacementTestController.getAnalytics,
);

router.get(
    '/:id',
    restrictTo('admin', 'content_creator'),
    validate(getPlacementTestByIdSchema),
    PlacementTestController.getById,
);

// ─── Mutation routes (admin only) ─────────────────────────────────────────────

router.post(
    '/',
    restrictTo('admin'),
    validate(createPlacementTestSchema),
    PlacementTestController.create,
);

router.put(
    '/:id',
    restrictTo('admin'),
    validate(updatePlacementTestSchema),
    PlacementTestController.update,
);

router.patch(
    '/:id/status',
    restrictTo('admin'),
    validate(updatePlacementTestStatusSchema),
    PlacementTestController.updateStatus,
);

// ⚠️ /rollback/:version MUST be registered before /:id
router.post(
    '/:id/rollback/:version',
    restrictTo('admin'),
    validate(rollbackSchema),
    PlacementTestController.rollback,
);

export default router;
