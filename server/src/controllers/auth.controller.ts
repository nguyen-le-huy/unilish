import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendResponse } from '../utils/send-response.js';
import { catchAsync } from '../utils/catch-async.js';
import { env } from '../config/env.js';

export class AuthController {
    static login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await authService.login(req.body);
        sendResponse(res, 200, 'Login successfully', result);
    });

    static register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await authService.register(req.body);
        sendResponse(res, 201, 'Registered successfully', result);
    });

    static verifyOTP = catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await authService.verifyOTP(email, otp);
        sendResponse(res, 200, result.message, result);
    });

    static googleCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // User is already authenticated by passport middleware
        const { user, token } = req.user as any;

        // Set token in session (HttpOnly cookie by default via cookie-session)
        if (req.session) {
            req.session.token = token;
        }

        // Redirect to client
        res.redirect(`${env.CLIENT_URL}/auth/success`);
    });
}
