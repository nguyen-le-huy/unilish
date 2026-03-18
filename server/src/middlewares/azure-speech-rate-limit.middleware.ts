import type { NextFunction, Request, Response } from 'express';
import redisClient from '../config/redis.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

type MemoryCounter = {
    count: number;
    resetAt: number;
};

const fallbackCounters = new Map<string, MemoryCounter>();

function getActorKey(req: Request): string {
    const userId = req.user?._id?.toString();
    return userId ? `user:${userId}` : `ip:${req.ip}`;
}

function enforceWithMemory(actorKey: string): void {
    const now = Date.now();
    const existing = fallbackCounters.get(actorKey);

    if (!existing || existing.resetAt <= now) {
        fallbackCounters.set(actorKey, {
            count: 1,
            resetAt: now + WINDOW_SECONDS * 1000,
        });
        return;
    }

    if (existing.count >= MAX_REQUESTS) {
        throw new AppError('Too many token requests. Please wait a minute and retry.', HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    fallbackCounters.set(actorKey, existing);
}

export const azureSpeechTokenRateLimit = async (
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const actorKey = `rate-limit:azure-speech-token:${getActorKey(req)}`;

        if (!redisClient.isReady) {
            enforceWithMemory(actorKey);
            next();
            return;
        }

        const count = await redisClient.incr(actorKey);
        if (count === 1) {
            await redisClient.expire(actorKey, WINDOW_SECONDS);
        }

        if (count > MAX_REQUESTS) {
            return next(
                new AppError('Too many token requests. Please wait a minute and retry.', HttpStatus.TOO_MANY_REQUESTS),
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};
