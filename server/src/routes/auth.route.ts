import express from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller.js';

const router = express.Router();

import { validate } from '../middlewares/validate.middleware.js';
import {
    loginSchema,
    registerSchema,
    verifyOtpSchema
} from '../validations/auth.validation.js';

// Traditional Auth
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/verify-otp', validate(verifyOtpSchema), AuthController.verifyOTP);

// Google OAuth
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    AuthController.googleCallback
);

export default router;
