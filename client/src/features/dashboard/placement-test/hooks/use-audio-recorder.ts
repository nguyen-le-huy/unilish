import { useCallback, useRef, useState } from 'react';

type PermissionState = 'granted' | 'denied' | 'prompt';

interface UseAudioRecorderResult {
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    isRecording: boolean;
    permissionState: PermissionState;
    requestPermission: () => Promise<boolean>;
}

export const useAudioRecorder = (): UseAudioRecorderResult => {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [permissionState, setPermissionState] = useState<PermissionState>('prompt');

    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionState('granted');
            stream.getTracks().forEach((track) => track.stop());
            return true;
        } catch {
            setPermissionState('denied');
            return false;
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setPermissionState('granted');
            streamRef.current = stream;
            chunksRef.current = [];

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.start();
            setIsRecording(true);
        } catch {
            setPermissionState('denied');
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setIsRecording(false);
            return null;
        }

        return new Promise<Blob | null>((resolve) => {
            recorder.onstop = () => {
                const audioBlob = chunksRef.current.length > 0
                    ? new Blob(chunksRef.current, { type: 'audio/webm' })
                    : null;

                streamRef.current?.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
                mediaRecorderRef.current = null;
                chunksRef.current = [];
                setIsRecording(false);

                resolve(audioBlob);
            };

            recorder.stop();
        });
    }, []);

    return {
        startRecording,
        stopRecording,
        isRecording,
        permissionState,
        requestPermission,
    };
};