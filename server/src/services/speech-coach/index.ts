/**
 * @module speech-coach/index
 * @description Public API for the Speech Coach module.
 * Only the surface area that outside code (socket setup, controllers) should consume.
 *
 * Rule: Do not re-export internals (orchestrators, cache repos, engines).
 * Only the facade service and gateway are public.
 */

export { SpeechCoachService } from './speech-coach.service.js';
export { SocketSessionGateway } from './transports/socket-session.gateway.js';
export { WebRtcSignalGateway } from './transports/webrtc-signal.gateway.js';

// ─── Public contract types only ──────────────────────────────────────────────
export type { ActiveSpeakingSession, FinalizedSpeakingSession, SpeakingPersonaId, SpeakingSessionStatus } from './contracts/session.contract.js';
export type { StartSessionInput } from './validations/start-session.schema.js';
export type { AudioChunkInput } from './validations/audio-chunk.schema.js';
export type { EndSessionInput, RecoverSessionInput } from './validations/end-session.schema.js';
export { SPEAKING_EVENTS_INBOUND, SPEAKING_EVENTS_OUTBOUND } from './contracts/events.contract.js';
export type { SpeakingInboundEventName, SpeakingOutboundEventName } from './contracts/events.contract.js';
