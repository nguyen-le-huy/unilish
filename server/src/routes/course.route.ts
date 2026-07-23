import express from 'express';
import { CourseController } from '../controllers/course.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createCourseSchema,
    deleteCourseSchema,
    getCourseByIdSchema,
    getCourseTreeSchema,
    getCoursesListSchema,
    toggleCourseSchema,
    updateCourseSchema,
} from '../validations/course.validation.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ─── Read (all authenticated roles) ─────────────────────────────────────────
router.get('/', validate(getCoursesListSchema), CourseController.getCoursesList);
router.get('/:courseId/tree', validate(getCourseTreeSchema), CourseController.getCourseTree);
router.get('/:courseId', validate(getCourseByIdSchema), CourseController.getCourseById);

// ─── Write (admin only) ─────────────────────────────────────────────────────
router.post(
    '/',
    restrictTo('admin'),
    validate(createCourseSchema),
    CourseController.createCourse,
);
router.put(
    '/:courseId',
    restrictTo('admin'),
    validate(updateCourseSchema),
    CourseController.updateCourse,
);
router.patch(
    '/:courseId/status',
    restrictTo('admin'),
    validate(toggleCourseSchema),
    CourseController.toggleCourseStatus,
);

// ─── Delete (admin only — destructive) ──────────────────────────────────────
router.delete(
    '/:courseId',
    restrictTo('admin'),
    validate(deleteCourseSchema),
    CourseController.deleteCourse,
);

export default router;
