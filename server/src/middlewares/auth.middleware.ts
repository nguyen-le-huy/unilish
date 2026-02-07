import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/mongo/user.model.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';

interface JwtPayload {
    id: string;
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from header or session
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.session && req.session.token) {
        token = req.session.token;
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', HttpStatus.UNAUTHORIZED));
    }

    // 2. Verify token
    if (!process.env.JWT_SECRET) {
        throw new AppError('Server configuration error: JWT_SECRET missing', 500);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;

        // 3. Check if user still exists (use lean for read optimization)
        const currentUser = await User.findById(decoded.id)
            .select('_id email fullName role avatarUrl currentLevel stats')
            .lean();

        if (!currentUser) {
            return next(
                new AppError('The user belonging to this token does no longer exist.', HttpStatus.UNAUTHORIZED),
            );
        }

        // 4. Grant access
        req.user = currentUser;
        next();
    } catch (error) {
        console.error('Token Verification Failed:', error);
        console.error('Token:', token);
        console.error('Secret (first 3 chars):', process.env.JWT_SECRET?.substring(0, 3));
        return next(new AppError('Invalid token signature or expired', 401));
    }
});

export const restrictTo = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(
                new AppError('You do not have permission to perform this action', HttpStatus.FORBIDDEN),
            );
        }
        next();
    };
};
