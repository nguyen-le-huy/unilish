import express from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/auth.controller.js';
import { env } from '../config/env.js';

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
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Google OAuth
router.get(
    '/google',
    (req, res, next) => {
        const clientUrl = req.query.clientUrl || env.CLIENT_URL;
        const state = Buffer.from(JSON.stringify({ clientUrl })).toString('base64');
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            state: state,
        })(req, res, next);
    }
);

router.get(
    '/google/callback',
    (req, res, next) => {
        if (req.query.error === 'access_denied') {
            res.redirect(`${env.CLIENT_URL}/auth/login?error=cancelled`);
            return;
        }

        next();
    },
    passport.authenticate('google', {
        failureRedirect: `${env.CLIENT_URL}/auth/login?error=oauth_failed`,
        session: false,
    }),
    AuthController.googleCallback
);

export default router;
