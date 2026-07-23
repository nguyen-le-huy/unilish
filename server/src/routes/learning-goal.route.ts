import express from 'express';
import { LearningGoalController } from '../controllers/learning-goal.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createLearningGoalSchema,
    getLearningGoalBySlugSchema,
    getLearningGoalsSchema,
    toggleLearningGoalSchema,
    updateLearningGoalSchema,
} from '../validations/learning-goal.validation.js';

const router = express.Router();

router.use(protect);

router.get('/', validate(getLearningGoalsSchema), LearningGoalController.getLearningGoals);

router.post('/', restrictTo('admin'), validate(createLearningGoalSchema), LearningGoalController.createLearningGoal);
router.put('/:slug', restrictTo('admin'), validate(updateLearningGoalSchema), LearningGoalController.updateLearningGoal);
router.patch(
    '/:slug/toggle',
    restrictTo('admin'),
    validate(toggleLearningGoalSchema),
    LearningGoalController.toggleLearningGoalStatus,
);
router.get('/:slug', validate(getLearningGoalBySlugSchema), LearningGoalController.getLearningGoalBySlug);

export default router;
