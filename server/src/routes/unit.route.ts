import express from 'express';
import { UnitController } from '../controllers/unit.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createUnitSchema,
    deleteUnitSchema,
    getUnitByIdSchema,
    getUnitsByCoursIdSchema,
    reorderUnitsSchema,
    updateUnitSchema,
} from '../validations/unit.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── Read ────────────────────────────────────────────────────────────────────
router.get('/', validate(getUnitsByCoursIdSchema), UnitController.getUnitsByCourseId);
router.get('/:unitId', validate(getUnitByIdSchema), UnitController.getUnitById);

// ─── Reorder (admin only) — before /:unitId to avoid param clash
router.patch(
    '/reorder',
    restrictTo('admin'),
    validate(reorderUnitsSchema),
    UnitController.reorderUnits,
);

// ─── Write ────────────────────────────────────────────────────────────────────
router.post(
    '/',
    restrictTo('admin'),
    validate(createUnitSchema),
    UnitController.createUnit,
);
router.put(
    '/:unitId',
    restrictTo('admin'),
    validate(updateUnitSchema),
    UnitController.updateUnit,
);
router.delete(
    '/:unitId',
    restrictTo('admin'),
    validate(deleteUnitSchema),
    UnitController.deleteUnit,
);

export default router;
