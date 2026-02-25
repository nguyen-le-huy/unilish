/**
 * @module session-recovery.policy
 * @description Recovery policy rules for speaking sessions.
 * Defines when a disconnected session is eligible for recovery vs. should be terminated.
 *
 * Phase 1 stub — enriched with circuit-breaker for silence threshold in Phase 1.
 */

import { logger } from '../../../utils/logger.js';
import type { ActiveSpeakingSession } from '../contracts/session.contract.js';

/** Maximum idle time (ms) before a session is declared unrecoverable */
const MAX_IDLE_MS = 5 * 60 * 1000; // 5 minutes

/** Maximum total session duration (ms) — hard cap */
const MAX_SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

export interface RecoveryEligibility {
    readonly eligible: boolean;
    readonly reason: string;
}

export class SessionRecoveryPolicy {
    /**
     * Determines whether a given session is eligible for recovery by a reconnecting client.
     */
    isRecoverable(session: ActiveSpeakingSession, nowMs: number = Date.now()): RecoveryEligibility {
        const idleMs = nowMs - session.lastActivityAt;
        const totalMs = nowMs - session.startedAt;

        if (session.status === 'ended' || session.status === 'error') {
            logger.debug('[SessionRecoveryPolicy] Session already terminated', {
                sessionId: session.sessionId,
                status: session.status,
            });
            return { eligible: false, reason: `Session already in terminal state: ${session.status}` };
        }

        if (idleMs > MAX_IDLE_MS) {
            logger.warn('[SessionRecoveryPolicy] Session idle timeout exceeded', {
                sessionId: session.sessionId,
                idleMs,
                MAX_IDLE_MS,
            });
            return { eligible: false, reason: `Session idle for ${idleMs}ms, exceeds threshold of ${MAX_IDLE_MS}ms` };
        }

        if (totalMs > MAX_SESSION_DURATION_MS) {
            logger.warn('[SessionRecoveryPolicy] Session max duration exceeded', {
                sessionId: session.sessionId,
                totalMs,
                MAX_SESSION_DURATION_MS,
            });
            return { eligible: false, reason: `Session duration ${totalMs}ms exceeds max ${MAX_SESSION_DURATION_MS}ms` };
        }

        return { eligible: true, reason: 'Session is recoverable' };
    }
}
