import express from 'express';
import { CourseSeriesController } from '../controllers/course-series.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createCourseSeriesSchema,
    deleteCourseSeriesSchema,
    getCourseSeriesBySlugSchema,
    getCourseSeriesListSchema,
    toggleCourseSeriesSchema,
    updateCourseSeriesSchema,
} from '../validations/course-series.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── Read (accessible to all authenticated roles) ───────────────────────────
router.get('/', validate(getCourseSeriesListSchema), CourseSeriesController.getSeriesList);
router.get('/:slug', validate(getCourseSeriesBySlugSchema), CourseSeriesController.getSeriesBySlug);

// ─── Write (admin & content_creator only) ───────────────────────────────────
router.post(
    '/',
    restrictTo('admin', 'content_creator'),
    validate(createCourseSeriesSchema),
    CourseSeriesController.createSeries,
);

router.put(
    '/:slug',
    restrictTo('admin', 'content_creator'),
    validate(updateCourseSeriesSchema),
    CourseSeriesController.updateSeries,
);

router.patch(
    '/:slug/toggle',
    restrictTo('admin', 'content_creator'),
    validate(toggleCourseSeriesSchema),
    CourseSeriesController.toggleStatus,
);

// ─── Delete (admin only — destructive action) ────────────────────────────────
router.delete(
    '/:slug',
    restrictTo('admin'),
    validate(deleteCourseSeriesSchema),
    CourseSeriesController.deleteSeries,
);

export default router;
