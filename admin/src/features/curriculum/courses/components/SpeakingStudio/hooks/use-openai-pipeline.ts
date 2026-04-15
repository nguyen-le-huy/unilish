import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth';
import type { LlmResult, SttResult } from '../types/pipeline.types';

export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}

export interface StreamReplyParams {
    lessonId: string;
    transcript: string;
    chatHistory: ChatHistoryItem[];
    pronunciationContext?: string;
    onChunk: (chunk: string) => void;
    onAudioStart?: () => void;
}

export interface UseOpenAiPipelineReturn {
    transcribe: (lessonId: string, audioBlob: Blob) => Promise<SttResult>;
    streamReply: (params: StreamReplyParams) => Promise<LlmResult>;
    playDirectly: (lessonId: string, text: string) => Promise<void>;
    waitForAudio: () => Promise<void>;
    interrupt: () => void;
    unlockAudio: () => void;
}

const parseSseEvents = (
    rawChunk: string,
): Array<{ event: string; data: Record<string, unknown> }> => {
    const blocks = rawChunk.split('\n\n').map((part) => part.trim()).filter(Boolean);
    const parsed: Array<{ event: string; data: Record<string, unknown> }> = [];

    blocks.forEach((block) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const eventLine = lines.find((line) => line.startsWith('event:'));
        const dataLine = lines.find((line) => line.startsWith('data:'));
        if (!eventLine || !dataLine) return;

        const event = eventLine.replace('event:', '').trim();
        const dataRaw = dataLine.replace('data:', '').trim();

        try {
            const data = JSON.parse(dataRaw) as Record<string, unknown>;
            parsed.push({ event, data });
        } catch {
            // Ignore malformed SSE payload
        }
    });

    return parsed;
};

const getApiBase = (): string => {
    const base = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5432/api';
    return base.replace(/\/$/, '');
};

export const useOpenAiPipeline = (): UseOpenAiPipelineReturn => {
    const chatAbortRef = useRef<AbortController | null>(null);
    const ttsControllersRef = useRef<AbortController[]>([]);
    const activeAudioRef = useRef<HTMLAudioElement | null>(null);

    // Audio Queue States
    const audioQueueRef = useRef<Promise<Blob | null>[]>([]);
    const isPlayingRef = useRef(false);
    const hasStartedPlayingRef = useRef(false);
    const finishResolversRef = useRef<(() => void)[]>([]);
    const onAudioStartRef = useRef<(() => void) | undefined>(undefined);
    const processAudioQueueRef = useRef<() => Promise<void>>(async () => {});

    const transcribe = useCallback(async (lessonId: string, audioBlob: Blob): Promise<SttResult> => {
        const token = useAuthStore.getState().token;
        const apiBase = getApiBase();

        const formData = new FormData();
        formData.append('lessonId', lessonId);
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch(`${apiBase}/v1/speaking/stt`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
        });

        if (!response.ok) {
            throw new Error('STT request failed.');
        }

        const data = await response.json() as SttResult;
        return {
            transcript: data.transcript,
            durationMs: data.durationMs,
        };
    }, []);

    const processAudioQueue = useCallback(async () => {
        if (isPlayingRef.current) return;

        if (audioQueueRef.current.length === 0) {
            finishResolversRef.current.forEach((resolve) => resolve());
            finishResolversRef.current = [];
            return;
        }

        isPlayingRef.current = true;
        const blobPromise = audioQueueRef.current.shift()!;

        try {
            const blob = await blobPromise;
            // If interrupted or failed properly
            if (!blob) {
                isPlayingRef.current = false;
                void processAudioQueueRef.current();
                return;
            }

            if (!hasStartedPlayingRef.current) {
                hasStartedPlayingRef.current = true;
                onAudioStartRef.current?.();
            }

            const url = URL.createObjectURL(blob);
            const audio = activeAudioRef.current || new Audio();
            activeAudioRef.current = audio;
            audio.src = url;

            await new Promise<void>((resolve) => {
                audio.onended = () => resolve();
                audio.onerror = () => resolve();
                audio.play().catch(() => resolve());
            });

            URL.revokeObjectURL(url);
            activeAudioRef.current = null;
        } catch {
            // Ignore single TTS chunk error, continue playing next
        }

        isPlayingRef.current = false;
        void processAudioQueueRef.current();
    }, []);

    useEffect(() => {
        processAudioQueueRef.current = processAudioQueue;
    }, [processAudioQueue]);

    const enqueueTTS = useCallback((lessonId: string, text: string) => {
        if (!text.trim()) return;

        const token = useAuthStore.getState().token;
        const apiBase = getApiBase();

        const abortController = new AbortController();
        ttsControllersRef.current.push(abortController);

        const promise = fetch(`${apiBase}/v1/speaking/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ lessonId, text }),
            signal: abortController.signal,
        })
            .then((res) => (res.ok ? res.blob() : null))
            .catch(() => null);

        audioQueueRef.current.push(promise);
        void processAudioQueue();
    }, [processAudioQueue]);

    const streamReply = useCallback(async ({
        lessonId,
        transcript,
        chatHistory,
        pronunciationContext,
        onChunk,
        onAudioStart,
    }: StreamReplyParams): Promise<LlmResult> => {
        const token = useAuthStore.getState().token;
        const apiBase = getApiBase();

        const abortController = new AbortController();
        chatAbortRef.current = abortController;

        onAudioStartRef.current = onAudioStart;
        hasStartedPlayingRef.current = false;
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        finishResolversRef.current = [];

        const response = await fetch(`${apiBase}/v1/speaking/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                lessonId,
                transcript,
                chatHistory,
                pronunciationContext,
            }),
            signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
            throw new Error('Chat pipeline request failed.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffered = '';

        let reply = '';
        let sentenceBuffer = '';
        let latencyMs = 0;
        let tokenUsage = 0;
        let model = '';
        let requestedModel = '';
        let usedFallback = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffered += decoder.decode(value, { stream: true });
            const parsedEvents = parseSseEvents(buffered);

            const consumed = buffered.lastIndexOf('\n\n');
            if (consumed >= 0) {
                buffered = buffered.slice(consumed + 2);
            }

            parsedEvents.forEach(({ event, data }) => {
                if (event === 'chunk') {
                    const text = typeof data.text === 'string' ? data.text : '';
                    if (text) {
                        reply += text;
                        onChunk(text);

                        sentenceBuffer += text;
                        // Match completed sentences ending with . ! ? followed by a space or newline
                        while (true) {
                            const match = sentenceBuffer.match(/^([\s\S]*?[.!?]+)([\s\n]+)([\s\S]*)$/);
                            if (match) {
                                const sentence = match[1].trim();
                                sentenceBuffer = match[3];
                                if (sentence) {
                                    enqueueTTS(lessonId, sentence);
                                }
                            } else {
                                break;
                            }
                        }
                    }
                }

                if (event === 'done') {
                    latencyMs = typeof data.latencyMs === 'number' ? data.latencyMs : latencyMs;
                    tokenUsage = typeof data.tokenUsage === 'number' ? data.tokenUsage : tokenUsage;
                    model = typeof data.model === 'string' ? data.model : model;
                    requestedModel = typeof data.requestedModel === 'string' ? data.requestedModel : requestedModel;
                    usedFallback = typeof data.usedFallback === 'boolean' ? data.usedFallback : usedFallback;
                }
            });
        }

        // Flush any remaining text in the buffer to TTS
        if (sentenceBuffer.trim()) {
            enqueueTTS(lessonId, sentenceBuffer.trim());
        }

        return {
            reply,
            latencyMs,
            tokenUsage,
            model,
            requestedModel,
            usedFallback,
        };
    }, [enqueueTTS]);

    const waitForAudio = useCallback((): Promise<void> => {
        if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve) => {
            finishResolversRef.current.push(resolve);
        });
    }, []);

    const playDirectly = useCallback(async (lessonId: string, text: string): Promise<void> => {
        enqueueTTS(lessonId, text);
        await waitForAudio();
    }, [enqueueTTS, waitForAudio]);

    const interrupt = useCallback(() => {
        chatAbortRef.current?.abort();
        chatAbortRef.current = null;

        ttsControllersRef.current.forEach((ctrl) => ctrl.abort());
        ttsControllersRef.current = [];

        audioQueueRef.current = [];
        isPlayingRef.current = false;
        hasStartedPlayingRef.current = false;

        const audio = activeAudioRef.current;
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
            // Note: we do not set activeAudioRef.current to null,
            // so we can reuse the unlocked element for the next queue item.
        }

        finishResolversRef.current.forEach((res) => res());
        finishResolversRef.current = [];
    }, []);

    const unlockAudio = useCallback(() => {
        if (!activeAudioRef.current) {
            const audio = new Audio();
            // Tiny silent WAV base64
            audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            audio.volume = 0;
            audio.play().catch(() => {});
            audio.volume = 1;
            activeAudioRef.current = audio;
        }
    }, []);

    return {
        transcribe,
        streamReply,
        playDirectly,
        waitForAudio,
        interrupt,
        unlockAudio,
    };
};
