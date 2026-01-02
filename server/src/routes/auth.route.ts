import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = express.Router();

// Traditional Auth
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/verify-otp', AuthController.verifyOTP);

// Clerk Auth Sync
router.post('/sync-clerk', AuthController.syncClerkUser);

export default router;
