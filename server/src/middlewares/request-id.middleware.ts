import type { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware that attaches a unique `requestId` to every request.
 * Used for structured logging and tracing across the system.
 *
 * The requestId is:
 * - Set on `req.requestId` (extend Express.Request type)
 * - Added to the response header `X-Request-Id`
 * - Available in logger context for correlating logs
 */
declare global {
    namespace Express {
        interface Request {
            requestId: string;
        }
    }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Use existing X-Request-Id header if provided (e.g., from API gateway)
    const existingId = req.headers['x-request-id'] as string | undefined;
    const requestId = existingId || uuidv4();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
}
