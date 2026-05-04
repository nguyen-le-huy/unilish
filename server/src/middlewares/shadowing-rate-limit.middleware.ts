import type { NextFunction, Request, Response } from 'express';
import redisClient from '../config/redis.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 5;

type MemoryCounter = {
    count: number;
    resetAt: number;
};

const fallbackCounters = new Map<string, MemoryCounter>();

const getActorKey = (req: Request): string => {
    const userId = req.user?._id?.toString();
    return userId ? `user:${userId}` : `ip:${req.ip}`;
};

const enforceWithMemory = (counterKey: string): void => {
    const now = Date.now();
    const existing = fallbackCounters.get(counterKey);

    if (!existing || existing.resetAt <= now) {
        fallbackCounters.set(counterKey, {
            count: 1,
            resetAt: now + WINDOW_SECONDS * 1000,
        });
        return;
    }

    if (existing.count >= MAX_REQUESTS) {
        throw new AppError('Too many video submissions. Please try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    fallbackCounters.set(counterKey, existing);
};

export const shadowingSubmitRateLimit = async (
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const counterKey = `rate-limit:shadowing:submit:${getActorKey(req)}`;

        if (!redisClient.isReady) {
            enforceWithMemory(counterKey);
            next();
            return;
        }

        const count = await redisClient.incr(counterKey);
        if (count === 1) {
            await redisClient.expire(counterKey, WINDOW_SECONDS);
        }

        if (count > MAX_REQUESTS) {
            next(
                new AppError('Too many video submissions. Please try again in a minute.', HttpStatus.TOO_MANY_REQUESTS),
            );
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
};
