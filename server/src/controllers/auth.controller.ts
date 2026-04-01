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

    private static setRefreshTokenCookie(res: Response, refreshToken: string): void {
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: AuthController.resolveCookieSecure(),
            sameSite: AuthController.resolveCookieSameSite(),
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    static login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await authService.login(req.body);
        AuthController.setRefreshTokenCookie(res, result.refreshToken);
        sendResponse(res, 200, 'Đăng nhập thành công', result);
    });

    static register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = await authService.register(req.body);
        sendResponse(res, 201, 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.', result);
    });

    static verifyOTP = catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await authService.verifyOTP(email, otp);
        AuthController.setRefreshTokenCookie(res, result.refreshToken);
        sendResponse(res, 200, 'Xác thực OTP thành công', result);
    });

    static googleCallback = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const result = req.user as GoogleAuthResult | undefined;
        if (!result) {
            throw new AppError('Google authentication failed', 401);
        }

        const { accessToken, refreshToken, isNewUser } = result;
        AuthController.setRefreshTokenCookie(res, refreshToken);

        const fragment = new URLSearchParams({
            accessToken,
            isNewUser: isNewUser ? '1' : '0',
        }).toString();

        res.redirect(`${env.CLIENT_URL}/auth/success#${fragment}`);
    });

    static refreshToken = catchAsync(async (req: Request, res: Response) => {
        const rawRefreshToken = req.cookies?.refreshToken as string | undefined;
        if (!rawRefreshToken) {
            throw new AppError('Không có refresh token', 401);
        }
        const result = await authService.refreshAccessToken(rawRefreshToken);
        sendResponse(res, 200, 'Token đã được làm mới', result);
    });

    static logout = catchAsync(async (req: Request, res: Response) => {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: AuthController.resolveCookieSecure(),
            sameSite: AuthController.resolveCookieSameSite(),
            path: '/',
        });
        sendResponse(res, 200, 'Đăng xuất thành công', null);
    });
}
