import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.js';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';

import { ZodError } from 'zod';

export const errorConverter = (err: any, req: Request, res: Response, next: NextFunction) => {
    let error = err;
    if (error instanceof ZodError) {
        const message = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        error = new AppError(message, HttpStatus.BAD_REQUEST);
    } else if (!(error instanceof AppError)) {
        const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error.message || 'Internal Server Error';
        error = new AppError(message, statusCode);
    }
    next(error);
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const { statusCode, message } = err;

    const response = {
        status: 'error',
        code: statusCode,
        message,
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    res.status(statusCode).json(response);
};
