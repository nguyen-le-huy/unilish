import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendResponse } from '../utils/send-response.js';
import { catchAsync } from '../utils/catch-async.js';

export class AuthController {
    static login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await AuthService.login(req.body);
        sendResponse(res, 200, 'Login successfully', result);
    });

    static register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await AuthService.register(req.body);
        sendResponse(res, 201, 'Registered successfully', result);
    });

    static verifyOTP = catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await AuthService.verifyOTP(email, otp);
        sendResponse(res, 200, result.message, result);
    });

    /**
     * Sync Clerk user data to MongoDB
     * Called from client after successful Clerk OAuth
     */
    static syncClerkUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { clerkId, email, fullName, avatarUrl } = req.body;

        if (!clerkId || !email) {
            return sendResponse(res, 400, 'clerkId and email are required', null);
        }

        const result = await AuthService.syncWithClerk({
            clerkId,
            email,
            fullName,
            avatarUrl,
        });

        sendResponse(res, 200, 'User synced successfully', result);
    });
}
