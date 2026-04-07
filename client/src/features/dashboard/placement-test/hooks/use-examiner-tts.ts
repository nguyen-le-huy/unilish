import { useCallback, useRef, useState } from 'react';
import { getExaminerVoice } from '../api/get-examiner-voice';

interface UseExaminerTtsResult {
    speak: (text: string, audioKey?: string) => Promise<void>;
    stop: () => void;
    isSpeaking: boolean;
}

export const useExaminerTts = (): UseExaminerTtsResult => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const activeAudioRef = useRef<HTMLAudioElement | null>(null);

    const stop = useCallback(() => {
        if (!activeAudioRef.current) {
            return;
        }

        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current = null;
        setIsSpeaking(false);
    }, []);

    const speak = useCallback(async (text: string, audioKey?: string) => {
        const normalizedText = text.trim();
        if (!normalizedText) {
            return;
        }

        stop();

        setIsSpeaking(true);
        try {
            const audioBlob = await getExaminerVoice({ text: normalizedText, audioKey });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            activeAudioRef.current = audio;

            await new Promise<void>((resolve, reject) => {
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    activeAudioRef.current = null;
                    resolve();
                };
                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    activeAudioRef.current = null;
                    reject(new Error('Failed to play examiner audio.'));
                };
                void audio.play();
            });
        } finally {
            setIsSpeaking(false);
        }
    }, [stop]);

    return {
        speak,
        stop,
        isSpeaking,
    };
};