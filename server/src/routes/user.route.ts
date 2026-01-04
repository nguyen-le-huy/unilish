import express from 'express';
import { UserController } from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateProfileSchema } from '../validations/user.validation.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.get('/me', UserController.getProfile);
router.patch('/me', validate(updateProfileSchema), UserController.updateProfile);

export default router;
