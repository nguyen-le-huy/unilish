/**
 * @module socket-session.gateway
 * @description Socket event registration gateway for the Speech Coach module.
 * Responsibility: Register inbound Socket event listeners, validate payloads via Zod,
 * then delegate pure business orchestration to the SpeechCoachService.
 * ZERO business logic here. This is a transport adapter only.
 */

import type { Socket } from 'socket.io';
import { logger } from '../../../utils/logger.js';
import { AppError } from '../../../utils/app-error.js';
import { SPEAKING_EVENTS_INBOUND, SPEAKING_EVENTS_OUTBOUND } from '../contracts/events.contract.js';
import { startSessionSchema } from '../validations/start-session.schema.js';
import { audioChunkSchema } from '../validations/audio-chunk.schema.js';
import { endSessionSchema, recoverSessionSchema } from '../validations/end-session.schema.js';
import type { SpeechCoachService } from '../speech-coach.service.js';

export class SocketSessionGateway {
    constructor(private readonly speechCoachService: SpeechCoachService) { }

    /**
     * Register all inbound speaking event listeners on a connected socket.
     * Called once per client connection in the Socket.io namespace setup.
     */
    register(socket: Socket): void {
        logger.info('[SocketSessionGateway] Registering speaking events for socket', {
            socketId: socket.id,
        });

        socket.on(
            SPEAKING_EVENTS_INBOUND.SESSION_START,
            this.handleSessionStart(socket)
        );
        socket.on(
            SPEAKING_EVENTS_INBOUND.AUDIO_CHUNK,
            this.handleAudioChunk(socket)
        );
        socket.on(
            SPEAKING_EVENTS_INBOUND.SESSION_END,
            this.handleSessionEnd(socket)
        );
        socket.on(
            SPEAKING_EVENTS_INBOUND.SESSION_RECOVER,
            this.handleSessionRecover(socket)
        );
    }

    // ─── Private handlers ──────────────────────────────────────────────────

    private handleSessionStart(socket: Socket) {
        return async (rawPayload: unknown): Promise<void> => {
            const parseResult = startSessionSchema.safeParse(rawPayload);
            if (!parseResult.success) {
                this.emitValidationError(socket, 'START_SESSION_INVALID', parseResult.error.message);
                return;
            }

            try {
                await this.speechCoachService.startSession(parseResult.data, socket);
            } catch (error) {
                this.handleError(socket, 'START_SESSION_FAILED', error);
            }
        };
    }

    private handleAudioChunk(socket: Socket) {
        return async (rawPayload: unknown): Promise<void> => {
            const parseResult = audioChunkSchema.safeParse(rawPayload);
            if (!parseResult.success) {
                this.emitValidationError(socket, 'AUDIO_CHUNK_INVALID', parseResult.error.message);
                return;
            }

            try {
                await this.speechCoachService.processAudioChunk(parseResult.data);
            } catch (error) {
                this.handleError(socket, 'AUDIO_CHUNK_FAILED', error);
            }
        };
    }

    private handleSessionEnd(socket: Socket) {
        return async (rawPayload: unknown): Promise<void> => {
            const parseResult = endSessionSchema.safeParse(rawPayload);
            if (!parseResult.success) {
                this.emitValidationError(socket, 'END_SESSION_INVALID', parseResult.error.message);
                return;
            }

            try {
                await this.speechCoachService.endSession(parseResult.data, socket);
            } catch (error) {
                this.handleError(socket, 'END_SESSION_FAILED', error);
            }
        };
    }

    private handleSessionRecover(socket: Socket) {
        return async (rawPayload: unknown): Promise<void> => {
            const parseResult = recoverSessionSchema.safeParse(rawPayload);
            if (!parseResult.success) {
                this.emitValidationError(socket, 'RECOVER_SESSION_INVALID', parseResult.error.message);
                return;
            }

            try {
                await this.speechCoachService.recoverSession(parseResult.data, socket);
            } catch (error) {
                this.handleError(socket, 'RECOVER_SESSION_FAILED', error);
            }
        };
    }

    // ─── Error helpers ─────────────────────────────────────────────────────

    private emitValidationError(socket: Socket, errorCode: string, message: string): void {
        logger.warn('[SocketSessionGateway] Validation failed', { errorCode, message });
        socket.emit(SPEAKING_EVENTS_OUTBOUND.SESSION_ERROR, {
            sessionId: 'unknown',
            traceId: 'unknown',
            errorCode,
            message,
            retryable: false,
        });
    }

    private handleError(socket: Socket, errorCode: string, error: unknown): void {
        const message = error instanceof AppError ? error.message : 'Internal server error';
        const retryable = error instanceof AppError && error.statusCode >= 500;
        logger.error('[SocketSessionGateway] Handler error', { errorCode, error });
        socket.emit(SPEAKING_EVENTS_OUTBOUND.SESSION_ERROR, {
            sessionId: 'unknown',
            traceId: 'unknown',
            errorCode,
            message,
            retryable,
        });
    }
}
