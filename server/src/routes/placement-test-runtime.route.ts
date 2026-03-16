import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { PlacementTestRuntimeController } from '../controllers/placement-test-runtime.controller.js';
import {
    createPlacementAttemptSchema,
    getActivePlacementRuntimeSchema,
    getPlacementAttemptByIdSchema,
    savePlacementAnswersSchema,
    submitPlacementAttemptSchema,
} from '../validations/placement-test-runtime.validation.js';

const router = express.Router();

router.use(protect);

router.get('/active', validate(getActivePlacementRuntimeSchema), PlacementTestRuntimeController.getActive);
router.post('/attempts', validate(createPlacementAttemptSchema), PlacementTestRuntimeController.createAttempt);
router.get('/attempts/:attemptId', validate(getPlacementAttemptByIdSchema), PlacementTestRuntimeController.getAttemptById);
router.patch('/attempts/:attemptId/answers', validate(savePlacementAnswersSchema), PlacementTestRuntimeController.saveAnswers);
router.post('/attempts/:attemptId/submit', validate(submitPlacementAttemptSchema), PlacementTestRuntimeController.submitAttempt);

export default router;
