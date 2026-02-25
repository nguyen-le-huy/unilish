/**
 * @module timeout.policy
 * @description Promise-based timeout wrapper for async operations.
 * Prevents engine calls from hanging indefinitely on provider delays.
 */

import { AppError } from '../../../utils/app-error.js';
import { HttpStatus } from '../../../constants/http-status.js';
import { logger } from '../../../utils/logger.js';

/**
 * Wraps a promise with a configurable timeout.
 * Throws AppError(408) if the operation exceeds the deadline.
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationLabel: string,
): Promise<T> {
    let timerHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timerHandle = setTimeout(() => {
            logger.warn(`[TimeoutPolicy] Operation timed out: ${operationLabel}`, {
                timeoutMs,
            });
            reject(
                new AppError(
                    `Operation "${operationLabel}" timed out after ${timeoutMs}ms`,
                    HttpStatus.REQUEST_TIMEOUT,
                ),
            );
        }, timeoutMs);
    });

    return Promise.race([
        promise.finally(() => clearTimeout(timerHandle)),
        timeoutPromise,
    ]);
}
