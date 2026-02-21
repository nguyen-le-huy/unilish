import express from 'express';
import { LearningGoalController } from '../controllers/learning-goal.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createLearningGoalSchema,
    duplicateLearningGoalSchema,
    getLearningGoalBySlugSchema,
    getLearningGoalsSchema,
    testLearningGoalSchema,
    toggleLearningGoalSchema,
    updateLearningGoalSchema,
} from '../validations/learning-goal.validation.js';

const router = express.Router();

router.use(protect);

router.get('/', validate(getLearningGoalsSchema), LearningGoalController.getLearningGoals);

router.post('/', restrictTo('admin', 'content_creator'), validate(createLearningGoalSchema), LearningGoalController.createLearningGoal);
router.put('/:slug', restrictTo('admin', 'content_creator'), validate(updateLearningGoalSchema), LearningGoalController.updateLearningGoal);
router.post(
    '/:slug/duplicate',
    restrictTo('admin', 'content_creator'),
    validate(duplicateLearningGoalSchema),
    LearningGoalController.duplicateLearningGoal,
);
router.patch(
    '/:slug/toggle',
    restrictTo('admin', 'content_creator'),
    validate(toggleLearningGoalSchema),
    LearningGoalController.toggleLearningGoalStatus,
);
router.post('/:slug/test', restrictTo('admin', 'content_creator'), validate(testLearningGoalSchema), LearningGoalController.testLearningGoal);
router.get('/:slug', validate(getLearningGoalBySlugSchema), LearningGoalController.getLearningGoalBySlug);

export default router;
