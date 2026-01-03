import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = express.Router();

import { validate } from '../middlewares/validate.middleware.js';
import {
    loginSchema,
    registerSchema,
    verifyOtpSchema,
    syncClerkSchema
} from '../validations/auth.validation.js';

// Traditional Auth
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/verify-otp', validate(verifyOtpSchema), AuthController.verifyOTP);

// Clerk Auth Sync
router.post('/sync-clerk', validate(syncClerkSchema), AuthController.syncClerkUser);

export default router;
