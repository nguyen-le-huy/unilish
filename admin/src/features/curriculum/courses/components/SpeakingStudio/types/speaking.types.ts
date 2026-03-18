import type { SpeakingLessonFormValues } from '../validations/speaking.validation';
import type { PronunciationResult } from './pipeline.types';

export type { SpeakingLessonFormValues };

export type CoachState = 'Idle' | 'Listening' | 'Thinking' | 'Speaking';

export interface CoachChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: number;
    pronunciation?: PronunciationResult | null;
}

export type SupportedAudioFormat = 'wav' | 'webm' | 'ogg' | 'mp3';

/** @v2-deferred — persona catalogue is V2 */
export type SpeakingPersonaId = 'airport-staff' | 'ielts-examiner' | 'business-client' | 'casual-friend';

export type SessionEndReason = 'user_initiated' | 'timeout' | 'error' | 'idle_cutoff' | 'completed';

// ─── Server → Client event payloads ──────────────────────────────────────────

export interface SessionStartedEvent {
    sessionId: string;
    traceId: string;
    timestamp: number;
    greeting: string;
    targetLanguage: string;
    voiceId?: string;
    roleName?: string;
    realtimeModel?: string;
}

/**
 * V1 — Every audio chunk from the OpenAI Realtime API.
 * `audioDelta` is base64-encoded PCM16 that the client plays via Web Audio API.
 */
export interface AiResponseChunkEvent {
    sessionId: string;
    traceId: string;
    sequenceNumber: number;
    /** Base64 PCM16 audio chunk */
    audioDelta: string;
    /** Live transcript text (optional) */
    textDelta?: string;
    isFinal: boolean;
    model?: string;
    requestedModel?: string;
    usedFallback?: boolean;
    latencyMs?: number;
    tokenUsage?: number;
}

/** Live streaming transcript delta during AI speech */
export interface TranscriptDeltaEvent {
    sessionId: string;
    traceId: string;
    role: 'user' | 'assistant';
    delta: string;
    isFinal: boolean;
}

export interface SessionEndedEvent {
    sessionId: string;
    traceId: string;
    durationMs: number;
    reason: SessionEndReason;
    transcriptSummary?: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface SessionErrorEvent {
    sessionId: string;
    traceId: string;
    errorCode: string;
    message: string;
    retryable: boolean;
}

export interface RealtimeSessionBootstrap {
    ephemeralKey: string;
    model: string;
    targetLanguage: string;
    voiceId: string;
    roleName: string;
    greeting: string;
}

// ─── CMS types (lesson form) ──────────────────────────────────────────────────

export interface AIConfig {
    roleName?: string;
    firstMessage?: string;
    systemInstruction?: string;
}

export interface KeywordConceptMap {
    word?: string;
    conceptId?: string;
}

export interface GradingConfig {
    referenceText: string | null;
    gradingSystem: 'FivePoint' | 'HundredMark';
    granularity: 'Phoneme' | 'Word' | 'Syllable';
    /** @v2-deferred — Azure prosody assessment is V2 */
    enableProsodyAssessment: boolean;
    requiredKeywords: string[];
    keywordConceptMap: KeywordConceptMap[];
}

export interface SpeakingHint {
    vi?: string;
    en?: string;
}

export interface SpeakingContent {
    type?: 'SPEAKING';
    missionTitle?: string;
    missionDescription?: string;
    aiConfig?: AIConfig;
    gradingConfig?: GradingConfig;
    hints?: SpeakingHint[];
}

export interface SaveSpeakingContentPayload {
    missionTitle?: string;
    missionDescription?: string;
    aiConfig?: AIConfig;
    gradingConfig?: GradingConfig;
    hints?: SpeakingHint[];
}

export interface GenerateMissionPayload {
    topic: string;
    context: string;
}

export interface TestSpeakingCoachPayload {
    userMessage: string;
}

export interface TestSpeakingCoachResponse {
    reply: string;
    latencyMs: number;
    tokenUsage: number;
    model: string;
}

export interface PhonemeDebugItem {
    word: string;
    accuracy: number;
    issue: string;
}

// ─── @v2-deferred types removed from V1 active use ───────────────────────────
// PhonemeDebugItem — Azure STT phoneme errors, V2 only
// AssessmentWordResult — Azure pronunciation word scores
// AssessmentFinalEvent — Azure overall scores
// UserTranscriptEvent — Azure STT transcript per turn

