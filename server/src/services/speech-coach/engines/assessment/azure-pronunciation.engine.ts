/**
 * @module azure-pronunciation.engine
 * @description Track 2 — Azure Cognitive Services Pronunciation Assessment engine adapter.
 * Manages the speech recognition + pronunciation assessment stream for each speaking turn.
 * Provider output is normalized via AssessmentNormalizer before being emitted or stored.
 *
 * Phase 0/2 stub — full integration in Phase 2.
 */

import { logger } from '../../../../utils/logger.js';
import { AssessmentNormalizer } from './assessment-normalizer.js';
import type { NormalizedAssessmentResult } from '../../contracts/assessment.contract.js';

export interface AssessmentEngineConfig {
    readonly sessionId: string;
    readonly traceId: string;
    readonly referenceText?: string; // Optional target text for stricter scoring
    readonly locale: string; // e.g. 'en-US'
}

export interface IAzurePronunciationEngine {
    initialize(config: AssessmentEngineConfig): Promise<void>;
    assessChunk(sessionId: string, audioData: string): Promise<NormalizedAssessmentResult | null>;
    terminate(sessionId: string): Promise<void>;
}

export class AzurePronunciationEngine implements IAzurePronunciationEngine {
    private readonly normalizer = new AssessmentNormalizer();

    async initialize(config: AssessmentEngineConfig): Promise<void> {
        logger.info('[AzurePronunciationEngine][STUB] initialize called', {
            sessionId: config.sessionId,
            locale: config.locale,
        });
        // TODO(Phase 2): Create Azure SpeechConfig + PronunciationAssessmentConfig
        // TODO(Phase 2): Create SpeechRecognizer with PushAudioInputStream
    }

    async assessChunk(sessionId: string, audioData: string): Promise<NormalizedAssessmentResult | null> {
        logger.debug('[AzurePronunciationEngine][STUB] assessChunk called', {
            sessionId,
            audioByteLength: audioData.length,
        });
        // TODO(Phase 2): Push audioData to PushAudioInputStream
        // TODO(Phase 2): Receive recognition result, normalize, return
        void audioData;
        return null;
    }

    async terminate(sessionId: string): Promise<void> {
        logger.info('[AzurePronunciationEngine][STUB] terminate called', { sessionId });
        // TODO(Phase 2): Stop recognizer and close audio stream
    }
}
