/**
 * @module webrtc-signal.gateway
 * @description Optional WebRTC signaling gateway stub.
 * Handles SDP/ICE-candidate signaling if the speaking module uses a WebRTC
 * peer-to-peer track instead of a pure Socket.io binary stream.
 *
 * Phase 0 stub — implementation deferred to Phase 2 when the engine path is decided.
 */

import type { Socket } from 'socket.io';
import { logger } from '../../../utils/logger.js';

// WebRTC signaling event names
const WEBRTC_EVENTS = {
    OFFER: 'webrtc.offer',
    ANSWER: 'webrtc.answer',
    ICE_CANDIDATE: 'webrtc.ice-candidate',
} as const;

export interface WebRtcOfferPayload {
    readonly sessionId: string;
    readonly sdp: RTCSessionDescriptionInit;
}

export interface WebRtcAnswerPayload {
    readonly sessionId: string;
    readonly sdp: RTCSessionDescriptionInit;
}

export interface WebRtcIceCandidatePayload {
    readonly sessionId: string;
    readonly candidate: RTCIceCandidateInit;
}

/**
 * WebRTC signaling gateway stub.
 * Registers placeholder handlers for WebRTC SDP and ICE event flows.
 * No business logic — forward to orchestration layer once implemented.
 */
export class WebRtcSignalGateway {
    register(socket: Socket): void {
        logger.debug('[WebRtcSignalGateway] Registering WebRTC signaling stubs', {
            socketId: socket.id,
        });

        socket.on(WEBRTC_EVENTS.OFFER, (_payload: WebRtcOfferPayload) => {
            // TODO(Phase 2): Forward SDP offer to peer connection manager
            logger.debug('[WebRtcSignalGateway][STUB] Received WebRTC offer', {
                socketId: socket.id,
            });
        });

        socket.on(WEBRTC_EVENTS.ANSWER, (_payload: WebRtcAnswerPayload) => {
            // TODO(Phase 2): Forward SDP answer to peer connection manager
            logger.debug('[WebRtcSignalGateway][STUB] Received WebRTC answer', {
                socketId: socket.id,
            });
        });

        socket.on(WEBRTC_EVENTS.ICE_CANDIDATE, (_payload: WebRtcIceCandidatePayload) => {
            // TODO(Phase 2): Relay ICE candidate to the remote peer
            logger.debug('[WebRtcSignalGateway][STUB] Received ICE candidate', {
                socketId: socket.id,
            });
        });
    }
}
