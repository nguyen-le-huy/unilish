import express from 'express';
import { UserController } from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateProfileSchema, getUsersSchema, updateSubscriptionSchema, updateRoleSchema } from '../validations/user.validation.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.get('/me', UserController.getProfile);
router.patch('/me', validate(updateProfileSchema), UserController.updateProfile);

// Admin only routes
router.use(restrictTo('admin'));

router.get('/', validate(getUsersSchema), UserController.getUsers);
router.get('/stats', UserController.getUserStats);
router.get('/:id', UserController.getUserById);
router.patch('/:id/subscription', validate(updateSubscriptionSchema), UserController.updateSubscription);
router.patch('/:id/role', validate(updateRoleSchema), UserController.updateRole);

export default router;
