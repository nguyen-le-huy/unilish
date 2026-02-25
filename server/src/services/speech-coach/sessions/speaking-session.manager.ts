/**
 * @module speaking-session.manager
 * @description High-level session manager for the Speech Coach module.
 * Orchestrates session CRUD through the Redis cache repo and applies
 * the session recovery policy.
 * This is the single access point from orchestrators to session state.
 */

import { logger } from '../../../utils/logger.js';
import { SpeakingSessionCacheRepo } from './speaking-session.cache.repo.js';
import type { ActiveSpeakingSession, SessionRecoverySnapshot } from '../contracts/session.contract.js';

export class SpeakingSessionManager {
    constructor(
        private readonly cacheRepo: SpeakingSessionCacheRepo,
    ) { }

    async createSession(session: ActiveSpeakingSession): Promise<void> {
        logger.info('[SpeakingSessionManager] Creating session', {
            sessionId: session.sessionId,
            userId: session.userId,
            personaId: session.personaId,
        });
        await this.cacheRepo.save(session);
    }

    async getSession(sessionId: string): Promise<ActiveSpeakingSession | null> {
        return this.cacheRepo.findById(sessionId);
    }

    async updateSession(
        sessionId: string,
        patch: Partial<Omit<ActiveSpeakingSession, 'sessionId' | 'userId' | 'lessonId' | 'traceId' | 'startedAt'>>,
    ): Promise<void> {
        logger.debug('[SpeakingSessionManager] Updating session', {
            sessionId,
            patchKeys: Object.keys(patch),
        });
        await this.cacheRepo.partialUpdate(sessionId, patch);
    }

    async deleteSession(sessionId: string): Promise<void> {
        logger.info('[SpeakingSessionManager] Deleting session', { sessionId });
        await this.cacheRepo.delete(sessionId);
    }

    async saveRecoverySnapshot(snapshot: SessionRecoverySnapshot): Promise<void> {
        logger.debug('[SpeakingSessionManager] Saving recovery snapshot', {
            sessionId: snapshot.sessionId,
            lastKnownSequence: snapshot.lastKnownSequence,
        });
        await this.cacheRepo.saveRecoverySnapshot(snapshot);
    }

    async getRecoverySnapshot(sessionId: string): Promise<SessionRecoverySnapshot | null> {
        return this.cacheRepo.findRecoverySnapshot(sessionId);
    }
}
