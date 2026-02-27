/**
 * V1 — Socket event name constants, mirroring server-side events.contract.ts.
 *
 * @v2-deferred USER_MESSAGE, USER_TRANSCRIPT, ASSESSMENT_PARTIAL, ASSESSMENT_FINAL, SESSION_RECOVER
 */

export const SPEAKING_EVENTS = {
    // ── Inbound (Client → Server) ──────────────────────────────────────────
    SESSION_START: 'speaking.session.start',
    AUDIO_CHUNK: 'speaking.audio.chunk',
    SESSION_END: 'speaking.session.end',
    // ── Outbound (Server → Client) ─────────────────────────────────────────
    SESSION_STARTED: 'speaking.session.started',
    AI_RESPONSE_CHUNK: 'speaking.ai.response.chunk',
    TRANSCRIPT_DELTA: 'speaking.transcript.delta',
    SESSION_ERROR: 'speaking.session.error',
    SESSION_ENDED: 'speaking.session.ended',
} as const;

export const SOCKET_API_ORIGIN = new URL(
    (import.meta.env.VITE_API_URL as string) || 'http://localhost:5432/api',
).origin;
