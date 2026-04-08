import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import type { GoogleAuthResult } from '../services/auth.service.js';
import { sendResponse } from '../utils/send-response.js';
import { catchAsync } from '../utils/catch-async.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

export class AuthController {
    private static resolveCookieSameSite(): 'strict' | 'lax' | 'none' {
        return env.NODE_ENV === 'production' ? 'none' : 'lax';
    }

    private static resolveCookieSecure(): boolean {
        return env.NODE_ENV === 'production';
    }

    private static setRefreshTokenCookie(res: Response, refreshToken: string, cookieName: string = 'refreshToken'): void {
        res.cookie(cookieName, refreshToken, {
            httpOnly: true,
            secure: AuthController.resolveCookieSecure(),
            sameSite: AuthController.resolveCookieSameSite(),
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    static login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await authService.login(req.body);
        const cookieName = req.body.appType === 'admin' ? 'adminRefreshToken' : 'refreshToken';
        AuthController.setRefreshTokenCookie(res, result.refreshToken, cookieName);
        sendResponse(res, 200, 'Đăng nhập thành công', result);
    });

    static register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await authService.register(req.body);
        sendResponse(res, 201, 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.', result);
    });

    static verifyOTP = catchAsync(async (req: Request, res: Response) => {
        const { email, otp, appType } = req.body;
        const result = await authService.verifyOTP(email, otp);
        const cookieName = appType === 'admin' ? 'adminRefreshToken' : 'refreshToken';
        AuthController.setRefreshTokenCookie(res, result.refreshToken, cookieName);
        sendResponse(res, 200, 'Xác thực OTP thành công', result);
    });

    static googleCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = req.user as GoogleAuthResult | undefined;
        if (!result) {
            throw new AppError('Google authentication failed', 401);
        }

        const { accessToken, refreshToken, isNewUser } = result;
        // Google auth is typically used for client only. Default to refreshToken.
        AuthController.setRefreshTokenCookie(res, refreshToken);

        const fragment = new URLSearchParams({
            accessToken,
            isNewUser: isNewUser ? '1' : '0',
        }).toString();

        res.redirect(`${env.CLIENT_URL}/auth/success#${fragment}`);
    });

    static refreshToken = catchAsync(async (req: Request, res: Response) => {
        const isClientAdmin = req.body.appType === 'admin' || req.query.appType === 'admin';
        const cookieName = isClientAdmin ? 'adminRefreshToken' : 'refreshToken';
        const rawRefreshToken = req.cookies?.[cookieName] as string | undefined;
        if (!rawRefreshToken) {
            throw new AppError('Không có refresh token', 401);
        }
        const result = await authService.refreshAccessToken(rawRefreshToken);
        sendResponse(res, 200, 'Token đã được làm mới', result);
    });

    static logout = catchAsync(async (req: Request, res: Response) => {
        const isClientAdmin = req.body.appType === 'admin' || req.query.appType === 'admin';
        const cookieName = isClientAdmin ? 'adminRefreshToken' : 'refreshToken';
        res.clearCookie(cookieName, {
            httpOnly: true,
            secure: AuthController.resolveCookieSecure(),
            sameSite: AuthController.resolveCookieSameSite(),
            path: '/',
        });
        sendResponse(res, 200, 'Đăng xuất thành công', null);
    });
}
