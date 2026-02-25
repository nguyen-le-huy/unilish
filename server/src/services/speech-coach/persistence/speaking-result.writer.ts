/**
 * @module speaking-result.writer
 * @description Persists finalized speaking session results to MongoDB.
 * Follows the Unilish repository pattern: no business logic — pure persistence.
 *
 * Phase 0/3 stub — Mongoose model + actual write deferred to Phase 3.
 */

import { logger } from '../../../utils/logger.js';
import type { FinalizedSpeakingSession } from '../contracts/session.contract.js';

export class SpeakingResultWriter {
    /**
     * Persist a finalized session to MongoDB.
     * Phase 3: will use SpeakingSession Mongoose model.
     */
    async write(session: FinalizedSpeakingSession): Promise<void> {
        logger.info('[SpeakingResultWriter][STUB] Persisting finalized session to MongoDB', {
            sessionId: session.sessionId,
            userId: session.userId,
            durationMs: session.durationMs,
            endReason: session.endReason,
        });

        // TODO(Phase 3): await SpeakingSessionModel.create(session);
        void session;
    }
}
