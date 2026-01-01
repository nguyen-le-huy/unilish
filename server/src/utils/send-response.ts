import type { Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';

export const sendResponse = <T>(
    res: Response,
    statusCode: number = HttpStatus.OK,
    message: string,
    data: T | null = null,
    meta: Record<string, any> | null = null,
) => {
    res.status(statusCode).json({
        status: 'success',
        code: statusCode,
        message,
        data,
        ...(meta && { meta }),
    });
};
