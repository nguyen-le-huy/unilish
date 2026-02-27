import { useCallback, useRef } from 'react';

import { speakingApi } from '../../../api/speaking.api';
import type {
    AiResponseChunkEvent,
    SessionEndReason,
    SessionEndedEvent,
    SessionErrorEvent,
    SessionStartedEvent,
    TranscriptDeltaEvent,
} from '../types/speaking.types';

interface StartRealtimeParams {
    token: string;
    userId: string;
    lessonId: string;
    nativeLanguage?: string;
    onSessionStarted: (event: SessionStartedEvent) => void;
    onAiResponseChunk: (event: AiResponseChunkEvent) => void;
    onTranscriptDelta: (event: TranscriptDeltaEvent) => void;
    onSessionEnded: (event: SessionEndedEvent) => void;
    onSessionError: (event: SessionErrorEvent) => void;
    onConnectError: (message?: string) => void;
    onRawEvent?: (eventType: string) => void;
}

interface StopRealtimeParams {
    userId?: string;
    lessonId: string;
    reason: SessionEndReason;
}

interface SendRealtimeUserMessageParams {
    message: string;
}

interface RealtimeEnvelope {
    type?: string;
    [key: string]: unknown;
}

const OPENAI_REALTIME_WEBRTC_URL = 'https://api.openai.com/v1/realtime';
const REALTIME_TRANSCRIPT_MODEL = 'gpt-4o-mini-transcribe';
const REALTIME_NOISE_REDUCTION = 'far_field';
const REALTIME_MAX_OUTPUT_TOKENS = 4096;

const randomId = () => crypto.randomUUID();

export const useSpeakingRealtime = () => {
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

    const activeRealtimeRef = useRef(false);
    const readyRef = useRef(false);
    const sessionStartTsRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string>('');
    const traceIdRef = useRef<string>('');
    const sequenceRef = useRef(0);

    const onSessionEndedRef = useRef<((event: SessionEndedEvent) => void) | null>(null);
    const onTranscriptDeltaRef = useRef<((event: TranscriptDeltaEvent) => void) | null>(null);
    const onAiResponseChunkRef = useRef<((event: AiResponseChunkEvent) => void) | null>(null);
    const onSessionErrorRef = useRef<((event: SessionErrorEvent) => void) | null>(null);
    const onRawEventRef = useRef<((eventType: string) => void) | null>(null);

    const emitSessionEnded = useCallback((reason: SessionEndReason) => {
        const startedAt = sessionStartTsRef.current ?? Date.now();
        const payload: SessionEndedEvent = {
            sessionId: sessionIdRef.current || randomId(),
            traceId: traceIdRef.current || randomId(),
            durationMs: Math.max(0, Date.now() - startedAt),
            reason,
        };
        onSessionEndedRef.current?.(payload);
    }, []);

    const cleanupConnection = useCallback(() => {
        readyRef.current = false;
        activeRealtimeRef.current = false;

        const dataChannel = dataChannelRef.current;
        if (dataChannel && dataChannel.readyState !== 'closed') {
            dataChannel.close();
        }
        dataChannelRef.current = null;

        const pc = peerConnectionRef.current;
        if (pc) {
            pc.ontrack = null;
            pc.onconnectionstatechange = null;
            pc.close();
        }
        peerConnectionRef.current = null;

        const stream = mediaStreamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        mediaStreamRef.current = null;

        const audio = remoteAudioRef.current;
        if (audio) {
            audio.srcObject = null;
            audio.remove();
        }
        remoteAudioRef.current = null;

        sessionStartTsRef.current = null;
        sessionIdRef.current = '';
        traceIdRef.current = '';
        sequenceRef.current = 0;
    }, []);

    const handleRealtimeEvent = useCallback((raw: string) => {
        let event: RealtimeEnvelope;
        try {
            event = JSON.parse(raw) as RealtimeEnvelope;
        } catch {
            return;
        }

        const eventType = typeof event.type === 'string' ? event.type : '';
        if (!eventType) return;

        onRawEventRef.current?.(eventType);

        switch (eventType) {
            case 'response.audio_transcript.done': {
                const transcript = typeof event.transcript === 'string' ? event.transcript.trim() : '';
                if (!transcript) return;
                onTranscriptDeltaRef.current?.({
                    sessionId: sessionIdRef.current,
                    traceId: traceIdRef.current,
                    role: 'assistant',
                    delta: transcript,
                    isFinal: true,
                });
                break;
            }
            case 'conversation.item.input_audio_transcription.completed': {
                const transcript = typeof event.transcript === 'string' ? event.transcript.trim() : '';
                if (!transcript) return;
                onTranscriptDeltaRef.current?.({
                    sessionId: sessionIdRef.current,
                    traceId: traceIdRef.current,
                    role: 'user',
                    delta: transcript,
                    isFinal: true,
                });

                const dc = dataChannelRef.current;
                if (dc && dc.readyState === 'open') {
                    dc.send(JSON.stringify({
                        type: 'response.create',
                        response: {
                            modalities: ['audio', 'text'],
                        },
                    }));
                }
                break;
            }
            case 'conversation.item.input_audio_transcription.failed': {
                const errorObj = (event.error as { message?: string; code?: string } | undefined);
                const message = errorObj?.message || 'Không thể nhận diện giọng nói từ microphone.';
                const code = errorObj?.code || 'TRANSCRIPTION_FAILED';

                onSessionErrorRef.current?.({
                    sessionId: sessionIdRef.current,
                    traceId: traceIdRef.current,
                    errorCode: code,
                    message,
                    retryable: true,
                });

                const dc = dataChannelRef.current;
                if (dc && dc.readyState === 'open') {
                    dc.send(JSON.stringify({
                        type: 'response.create',
                        response: {
                            modalities: ['audio', 'text'],
                        },
                    }));
                }
                break;
            }
            case 'response.done': {
                onAiResponseChunkRef.current?.({
                    sessionId: sessionIdRef.current,
                    traceId: traceIdRef.current,
                    sequenceNumber: -1,
                    audioDelta: '',
                    isFinal: true,
                });
                break;
            }
            case 'error': {
                const errorObj = (event.error as { message?: string; code?: string } | undefined);
                const message = errorObj?.message || 'OpenAI Realtime error';
                const code = errorObj?.code || 'OPENAI_REALTIME_ERROR';
                onSessionErrorRef.current?.({
                    sessionId: sessionIdRef.current,
                    traceId: traceIdRef.current,
                    errorCode: code,
                    message,
                    retryable: false,
                });
                break;
            }
            default:
                break;
        }
    }, []);

    const startRealtime = useCallback(async (params: StartRealtimeParams): Promise<boolean> => {
        const {
            lessonId,
            onSessionStarted,
            onAiResponseChunk,
            onTranscriptDelta,
            onSessionEnded,
            onSessionError,
            onConnectError,
            onRawEvent,
        } = params;

        onSessionEndedRef.current = onSessionEnded;
        onTranscriptDeltaRef.current = onTranscriptDelta;
        onAiResponseChunkRef.current = onAiResponseChunk;
        onSessionErrorRef.current = onSessionError;
        onRawEventRef.current = onRawEvent ?? null;

        if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
            onConnectError('Trình duyệt chưa hỗ trợ microphone/WebRTC cho OpenAI Realtime.');
            return false;
        }

        try {
            cleanupConnection();

            const bootstrap = await speakingApi.getRealtimeSession(lessonId);

            const pc = new RTCPeerConnection();
            peerConnectionRef.current = pc;

            const remoteAudio = document.createElement('audio');
            remoteAudio.autoplay = true;
            remoteAudio.style.display = 'none';
            document.body.appendChild(remoteAudio);
            remoteAudioRef.current = remoteAudio;

            pc.ontrack = (trackEvent) => {
                remoteAudio.srcObject = trackEvent.streams[0] || null;
                void remoteAudio.play().catch(() => {
                    // ignore autoplay errors; user gesture on toggle usually unlocks playback
                });
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    if (activeRealtimeRef.current) {
                        emitSessionEnded('error');
                    }
                    cleanupConnection();
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                onConnectError('Không tìm thấy audio track từ microphone.');
                cleanupConnection();
                return false;
            }
            mediaStreamRef.current = stream;
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            const dc = pc.createDataChannel('oai-events');
            dataChannelRef.current = dc;

            const waitForDataChannelOpen = new Promise<boolean>((resolve) => {
                let settled = false;
                const timeoutId = window.setTimeout(() => {
                    if (settled) return;
                    settled = true;
                    resolve(false);
                }, 8000);

                dc.addEventListener('open', () => {
                    if (settled) return;
                    settled = true;
                    window.clearTimeout(timeoutId);
                    resolve(true);
                }, { once: true });

                dc.addEventListener('close', () => {
                    if (settled) return;
                    settled = true;
                    window.clearTimeout(timeoutId);
                    resolve(false);
                }, { once: true });
            });

            dc.onmessage = (messageEvent) => {
                if (typeof messageEvent.data !== 'string') return;
                handleRealtimeEvent(messageEvent.data);
            };

            dc.onopen = () => {
                readyRef.current = true;

                dc.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        modalities: ['audio', 'text'],
                        input_audio_transcription: {
                            model: REALTIME_TRANSCRIPT_MODEL,
                        },
                        input_audio_noise_reduction: {
                            type: REALTIME_NOISE_REDUCTION,
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500,
                            create_response: false,
                        },
                        max_response_output_tokens: REALTIME_MAX_OUTPUT_TOKENS,
                    },
                }));

                const greetingInstruction = bootstrap.greeting?.trim().length
                    ? `Start the conversation now. Say exactly this greeting first: "${bootstrap.greeting}"`
                    : 'Start the conversation now with a short natural greeting in-character.';

                dc.send(JSON.stringify({
                    type: 'response.create',
                    response: {
                        modalities: ['audio', 'text'],
                        instructions: greetingInstruction,
                    },
                }));
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpResponse = await fetch(
                `${OPENAI_REALTIME_WEBRTC_URL}?model=${encodeURIComponent(bootstrap.model)}`,
                {
                    method: 'POST',
                    body: offer.sdp ?? '',
                    headers: {
                        Authorization: `Bearer ${bootstrap.ephemeralKey}`,
                        'OpenAI-Beta': 'realtime=v1',
                        'Content-Type': 'application/sdp',
                    },
                },
            );

            if (!sdpResponse.ok) {
                onConnectError(`Kết nối OpenAI Realtime thất bại (HTTP ${sdpResponse.status}).`);
                cleanupConnection();
                return false;
            }

            const answerSdp = await sdpResponse.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

            const channelReady = await waitForDataChannelOpen;
            if (!channelReady) {
                onConnectError('Kết nối realtime chưa sẵn sàng (data channel timeout).');
                cleanupConnection();
                return false;
            }

            activeRealtimeRef.current = true;
            readyRef.current = true;
            sessionStartTsRef.current = Date.now();
            sessionIdRef.current = randomId();
            traceIdRef.current = randomId();
            sequenceRef.current = 0;

            onSessionStarted({
                sessionId: sessionIdRef.current,
                traceId: traceIdRef.current,
                timestamp: sessionStartTsRef.current,
                greeting: bootstrap.greeting,
                targetLanguage: bootstrap.targetLanguage,
                voiceId: bootstrap.voiceId,
                roleName: bootstrap.roleName,
                realtimeModel: bootstrap.model,
            });

            return true;
        } catch (error) {
            cleanupConnection();
            const message = error instanceof Error ? error.message : 'Không thể khởi tạo OpenAI Realtime.';
            onConnectError(message);
            return false;
        }
    }, [cleanupConnection, emitSessionEnded, handleRealtimeEvent]);

    const sendRealtimeUserMessage = useCallback((params: SendRealtimeUserMessageParams): boolean => {
        const dc = dataChannelRef.current;
        const text = params.message.trim();
        if (!dc || dc.readyState !== 'open' || !text) {
            return false;
        }

        dc.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text }],
            },
        }));

        dc.send(JSON.stringify({
            type: 'response.create',
            response: {
                modalities: ['audio', 'text'],
            },
        }));

        return true;
    }, []);

    const stopRealtime = useCallback((params: StopRealtimeParams) => {
        if (!activeRealtimeRef.current) {
            cleanupConnection();
            return;
        }

        emitSessionEnded(params.reason);
        cleanupConnection();
    }, [cleanupConnection, emitSessionEnded]);

    const cleanup = useCallback(() => {
        cleanupConnection();
    }, [cleanupConnection]);

    return {
        startRealtime,
        stopRealtime,
        cleanup,
        sendRealtimeUserMessage,
        isSocketReady: () => readyRef.current,
        isRealtimeActive: () => activeRealtimeRef.current,
    };
};
