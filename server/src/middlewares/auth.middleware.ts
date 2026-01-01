import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';

interface JwtPayload {
    id: string;
}

export const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('You are not logged in! Please log in to get access.', HttpStatus.UNAUTHORIZED));
    }

    // 2. Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(
            new AppError('The user belonging to this token does no longer exist.', HttpStatus.UNAUTHORIZED),
        );
    }

    // 4. Grant access
    req.user = currentUser;
    next();
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
