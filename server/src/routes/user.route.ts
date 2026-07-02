import express from 'express';
import { UserController } from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateProfileSchema, getUsersSchema, updateRoleSchema, updateLevelSchema } from '../validations/user.validation.js';
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
router.patch('/:id/role', validate(updateRoleSchema), UserController.updateRole);
router.patch('/:id/level', validate(updateLevelSchema), UserController.updateLevel);
router.delete('/:id', UserController.deleteUser);

export default router;
