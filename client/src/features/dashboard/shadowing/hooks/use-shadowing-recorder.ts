import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseShadowingRecorderReturn {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob>;
    isRecording: boolean;
}

const DEFAULT_MIME_TYPE = 'audio/webm';
const PREFERRED_MIME_TYPES = ['audio/wav', 'audio/webm;codecs=opus', 'audio/webm'];

const resolveMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined') {
        return undefined;
    }

    return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
};

export const useShadowingRecorder = (): UseShadowingRecorderReturn => {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    const [isRecording, setIsRecording] = useState(false);

    const releaseStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    }, []);

    const startRecording = useCallback(async (): Promise<void> => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            throw new Error('This browser does not support microphone recording.');
        }

        if (isRecording) {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = resolveMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

            streamRef.current = stream;
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.start();
            setIsRecording(true);
        } catch (error) {
            const isPermissionDenied = error instanceof DOMException && error.name === 'NotAllowedError';
            if (isPermissionDenied) {
                throw new Error('Microphone permission denied');
            }

            throw error;
        }
    }, [isRecording]);

    const stopRecording = useCallback(async (): Promise<Blob> => {
        const recorder = mediaRecorderRef.current;

        if (!recorder || recorder.state !== 'recording') {
            throw new Error('No active recording session.');
        }

        return new Promise<Blob>((resolve) => {
            recorder.onstop = () => {
                const mimeType = recorder.mimeType || DEFAULT_MIME_TYPE;
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });

                mediaRecorderRef.current = null;
                chunksRef.current = [];
                releaseStream();
                setIsRecording(false);

                resolve(audioBlob);
            };

            recorder.stop();
        });
    }, [releaseStream]);

    useEffect(() => {
        return () => {
            releaseStream();
        };
    }, [releaseStream]);

    return useMemo(() => ({
        startRecording,
        stopRecording,
        isRecording,
    }), [isRecording, startRecording, stopRecording]);
};
