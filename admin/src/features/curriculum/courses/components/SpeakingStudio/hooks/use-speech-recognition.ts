import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechRecognitionAlternativeLike {
    transcript: string;
}

interface SpeechRecognitionResultLike {
    isFinal: boolean;
    readonly length: number;
    [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
    readonly resultIndex: number;
    readonly results: {
        readonly length: number;
        [index: number]: SpeechRecognitionResultLike;
    };
}

interface SpeechRecognitionErrorEventLike extends Event {
    error: 'aborted' | 'audio-capture' | 'bad-grammar' | 'language-not-supported' | 'network' | 'no-speech' | 'not-allowed' | 'service-not-allowed';
}

interface SpeechRecognitionLike extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface UseSpeechRecognitionParams {
    onFinalTranscript: (text: string) => void;
    onInterimTranscript: (text: string) => void;
    onPermissionDenied: () => void;
    onAudioCaptureError: () => void;
    onSoftError: (message: string) => void;
}

export const useSpeechRecognition = ({
    onFinalTranscript,
    onInterimTranscript,
    onPermissionDenied,
    onAudioCaptureError,
    onSoftError,
}: UseSpeechRecognitionParams) => {
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const manualStopRef = useRef(false);
    const restartTimerRef = useRef<number | null>(null);
    const networkDownRef = useRef(false);
    const activeRealtimeRef = useRef(false);
    const onFinalTranscriptRef = useRef(onFinalTranscript);
    const onInterimTranscriptRef = useRef(onInterimTranscript);
    const onPermissionDeniedRef = useRef(onPermissionDenied);
    const onAudioCaptureErrorRef = useRef(onAudioCaptureError);
    const onSoftErrorRef = useRef(onSoftError);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        onFinalTranscriptRef.current = onFinalTranscript;
        onInterimTranscriptRef.current = onInterimTranscript;
        onPermissionDeniedRef.current = onPermissionDenied;
        onAudioCaptureErrorRef.current = onAudioCaptureError;
        onSoftErrorRef.current = onSoftError;
    }, [onAudioCaptureError, onFinalTranscript, onInterimTranscript, onPermissionDenied, onSoftError]);

    const getSpeechRecognitionCtor = useCallback((): SpeechRecognitionConstructor | null => {
        if (typeof window === 'undefined') return null;

        const maybeWindow = window as Window & {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
        };

        return maybeWindow.SpeechRecognition ?? maybeWindow.webkitSpeechRecognition ?? null;
    }, []);

    const stop = useCallback(() => {
        activeRealtimeRef.current = false;
        manualStopRef.current = true;

        if (restartTimerRef.current !== null) {
            window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }

        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const start = useCallback((): boolean => {
        if (networkDownRef.current) {
            return false;
        }

        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) {
            return false;
        }

        if (!recognitionRef.current) {
            const recognition = new Ctor();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let interimText = '';

                for (let index = event.resultIndex; index < event.results.length; index += 1) {
                    const result = event.results[index];
                    const transcript = result[0]?.transcript?.trim() ?? '';
                    if (!transcript) continue;

                    if (result.isFinal) {
                        onInterimTranscriptRef.current('');
                        onFinalTranscriptRef.current(transcript);
                    } else {
                        interimText = `${interimText} ${transcript}`.trim();
                    }
                }

                onInterimTranscriptRef.current(interimText);
            };

            recognition.onerror = (event: Event) => {
                const speechEvent = event as SpeechRecognitionErrorEventLike;
                const errorCode = speechEvent.error ?? 'unknown';

                if (errorCode === 'aborted') {
                    if (!manualStopRef.current) {
                        onSoftErrorRef.current('Mic bị dừng đột ngột (aborted). Hãy thử bật lại.');
                    }
                    return;
                }

                if (errorCode === 'no-speech') {
                    onSoftErrorRef.current('Không nhận được giọng nói (no-speech). Hãy nói gần micro hơn.');
                    return;
                }

                if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
                    onPermissionDeniedRef.current();
                    activeRealtimeRef.current = false;
                    setIsListening(false);
                    return;
                }

                if (errorCode === 'audio-capture') {
                    onAudioCaptureErrorRef.current();
                    activeRealtimeRef.current = false;
                    setIsListening(false);
                    return;
                }

                if (errorCode === 'network') {
                    networkDownRef.current = true;
                    manualStopRef.current = true;
                    recognition.stop();
                    setIsListening(false);
                    return;
                }

                onSoftErrorRef.current(`Mic realtime lỗi: ${errorCode}`);
            };

            recognition.onend = () => {
                if (manualStopRef.current) {
                    manualStopRef.current = false;
                    setIsListening(false);
                    return;
                }

                if (activeRealtimeRef.current) {
                    if (restartTimerRef.current !== null) {
                        window.clearTimeout(restartTimerRef.current);
                    }

                    restartTimerRef.current = window.setTimeout(() => {
                        try {
                            recognition.start();
                            setIsListening(true);
                        } catch {
                            setIsListening(false);
                        }
                    }, 250);
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
        }

        try {
            activeRealtimeRef.current = true;
            manualStopRef.current = false;
            recognitionRef.current.start();
            setIsListening(true);
            return true;
        } catch {
            onSoftErrorRef.current('Không thể bật mic. Có thể đang bị chặn quyền microphone.');
            return false;
        }
    }, [getSpeechRecognitionCtor]);

    const resetNetworkDown = useCallback(() => {
        networkDownRef.current = false;
    }, []);

    const isNetworkDown = useCallback(() => networkDownRef.current, []);

    const cleanup = useCallback(() => {
        stop();

        if (restartTimerRef.current !== null) {
            window.clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
    }, [stop]);

    return {
        start,
        stop,
        cleanup,
        resetNetworkDown,
        isNetworkDown,
        isListening,
    };
};
