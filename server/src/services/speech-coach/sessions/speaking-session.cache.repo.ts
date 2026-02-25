/**
 * @module speaking-session.cache.repo
 * @description Redis-backed repository for persisting active speaking session state.
 * All keys are namespaced under `speech-coach:session:<sessionId>`.
 * TTL is set on every write to enforce session expiry.
 *
 * Follows Unilish repository contract: no business logic, pure I/O.
 */

import redisClient from '../../../config/redis.js';
import { logger } from '../../../utils/logger.js';
import type { ActiveSpeakingSession, SessionRecoverySnapshot } from '../contracts/session.contract.js';

const SESSION_TTL_SECONDS = 3_600; // 1 hour max session lifetime
const RECOVERY_SNAPSHOT_TTL_SECONDS = 86_400; // 24 hours

const sessionKey = (sessionId: string): string => `speech-coach:session:${sessionId}`;
const recoveryKey = (sessionId: string): string => `speech-coach:recovery:${sessionId}`;

export class SpeakingSessionCacheRepo {
    async save(session: ActiveSpeakingSession): Promise<void> {
        const key = sessionKey(session.sessionId);
        try {
            await redisClient.setEx(key, SESSION_TTL_SECONDS, JSON.stringify(session));
            logger.debug('[SpeakingSessionCacheRepo] Session persisted to Redis', {
                sessionId: session.sessionId,
                ttl: SESSION_TTL_SECONDS,
            });
        } catch (error) {
            logger.error('[SpeakingSessionCacheRepo] Failed to save session', {
                sessionId: session.sessionId,
                error,
            });
            throw error;
        }
    }

    async findById(sessionId: string): Promise<ActiveSpeakingSession | null> {
        const key = sessionKey(sessionId);
        try {
            const raw = await redisClient.get(key);
            if (!raw) return null;
            return JSON.parse(raw) as ActiveSpeakingSession;
        } catch (error) {
            logger.error('[SpeakingSessionCacheRepo] Failed to find session', {
                sessionId,
                error,
            });
            return null;
        }
    }

    async partialUpdate(
        sessionId: string,
        patch: Partial<Omit<ActiveSpeakingSession, 'sessionId' | 'userId' | 'lessonId' | 'traceId' | 'startedAt'>>,
    ): Promise<void> {
        const existing = await this.findById(sessionId);
        if (!existing) {
            logger.warn('[SpeakingSessionCacheRepo] Attempted partial update on missing session', {
                sessionId,
            });
            return;
        }
        const updated: ActiveSpeakingSession = { ...existing, ...patch };
        await this.save(updated);
    }

    async delete(sessionId: string): Promise<void> {
        try {
            await redisClient.del(sessionKey(sessionId));
            logger.debug('[SpeakingSessionCacheRepo] Session deleted from Redis', { sessionId });
        } catch (error) {
            logger.error('[SpeakingSessionCacheRepo] Failed to delete session', {
                sessionId,
                error,
            });
        }
    }

    // ─── Recovery snapshot helpers ────────────────────────────────────────

    async saveRecoverySnapshot(snapshot: SessionRecoverySnapshot): Promise<void> {
        try {
            await redisClient.setEx(
                recoveryKey(snapshot.sessionId),
                RECOVERY_SNAPSHOT_TTL_SECONDS,
                JSON.stringify(snapshot),
            );
        } catch (error) {
            logger.error('[SpeakingSessionCacheRepo] Failed to save recovery snapshot', {
                sessionId: snapshot.sessionId,
                error,
            });
        }
    }

    async findRecoverySnapshot(sessionId: string): Promise<SessionRecoverySnapshot | null> {
        try {
            const raw = await redisClient.get(recoveryKey(sessionId));
            if (!raw) return null;
            return JSON.parse(raw) as SessionRecoverySnapshot;
        } catch (error) {
            logger.error('[SpeakingSessionCacheRepo] Failed to find recovery snapshot', {
                sessionId,
                error,
            });
            return null;
        }
    }
}
