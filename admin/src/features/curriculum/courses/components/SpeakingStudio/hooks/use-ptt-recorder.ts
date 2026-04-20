import { useCallback, useEffect, useRef, useState } from 'react';
import { notification } from '@/lib/notification';

const MIN_DURATION_MS = 1500;
const MAX_DURATION_MS = 30000;

interface StopResult {
    blob: Blob;
    durationMs: number;
}

interface UsePttRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<boolean>;
    stopRecording: () => Promise<StopResult | null>;
    reset: () => void;
}

export const usePttRecorder = (): UsePttRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const startedAtRef = useRef<number | null>(null);
    const autoStopTimerRef = useRef<number | null>(null);
    const stopResolverRef = useRef<((value: StopResult | null) => void) | null>(null);

    const clearTimer = () => {
        if (autoStopTimerRef.current !== null) {
            window.clearTimeout(autoStopTimerRef.current);
            autoStopTimerRef.current = null;
        }
    };

    const releaseStream = useCallback(() => {
        clearTimer();
        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        startedAtRef.current = null;
    }, []);

    const startRecording = useCallback(async (): Promise<boolean> => {
        if (isRecording) {
            return true;
        }

        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            notification.error('Trình duyệt chưa hỗ trợ ghi âm microphone.');
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            streamRef.current = stream;
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];
            startedAtRef.current = Date.now();

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const startedAt = startedAtRef.current;
                const durationMs = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });

                const resolve = stopResolverRef.current;
                stopResolverRef.current = null;

                if (durationMs < MIN_DURATION_MS) {
                    notification.warning('Vui lòng nói lâu hơn một chút.');
                    resolve?.(null);
                    releaseStream();
                    setIsRecording(false);
                    return;
                }

                resolve?.({ blob, durationMs });
                releaseStream();
                setIsRecording(false);
            };

            recorder.start();
            setIsRecording(true);

            autoStopTimerRef.current = window.setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    notification.warning('Đã tự dừng ghi âm sau 30 giây.');
                    mediaRecorderRef.current.stop();
                }
            }, MAX_DURATION_MS);

            return true;
        } catch {
            notification.error('Không thể truy cập microphone. Hãy kiểm tra quyền trình duyệt.');
            releaseStream();
            setIsRecording(false);
            return false;
        }
    }, [isRecording, releaseStream]);

    const stopRecording = useCallback(async (): Promise<StopResult | null> => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state !== 'recording') {
            return null;
        }

        return new Promise<StopResult | null>((resolve) => {
            stopResolverRef.current = resolve;
            recorder.stop();
        });
    }, []);

    const reset = useCallback(() => {
        stopResolverRef.current?.(null);
        stopResolverRef.current = null;

        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state === 'recording') {
            recorder.stop();
        }

        releaseStream();
        setIsRecording(false);
    }, [releaseStream]);

    useEffect(() => {
        return () => {
            reset();
        };
    }, [reset]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        reset,
    };
};