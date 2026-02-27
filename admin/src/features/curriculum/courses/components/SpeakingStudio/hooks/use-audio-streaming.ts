import { useCallback, useRef } from 'react';

import { decodePcm16Base64 } from '../lib/audio-codec';

interface UseAudioStreamingParams {
    onSpeakingStart: () => void;
    onSpeakingEnd: () => void;
}

export const useAudioStreaming = ({ onSpeakingStart, onSpeakingEnd }: UseAudioStreamingParams) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioPlaybackQueueRef = useRef<Promise<void>>(Promise.resolve());

    const interruptRealtimeAudioPlayback = useCallback(async () => {
        const context = audioContextRef.current;
        audioContextRef.current = null;

        if (!context) return;

        try {
            await context.close();
        } catch {
            // ignore
        }
    }, []);

    const speakAssistantReply = useCallback((text: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        onSpeakingStart();
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => {
            onSpeakingEnd();
        };

        window.speechSynthesis.speak(utterance);
    }, [onSpeakingEnd, onSpeakingStart]);

    const playRealtimeAudio = useCallback((audioBase64: string) => {
        if (typeof window === 'undefined') return;

        const playTask = async () => {
            const pcm = decodePcm16Base64(audioBase64);
            const sampleCount = pcm.length;
            if (sampleCount <= 0) return;

            const context = audioContextRef.current ?? new AudioContext({ sampleRate: 24000 });
            audioContextRef.current = context;

            const audioBuffer = context.createBuffer(1, sampleCount, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let index = 0; index < sampleCount; index += 1) {
                channelData[index] = pcm[index];
            }

            await context.resume();

            await new Promise<void>((resolve) => {
                const source = context.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(context.destination);
                source.onended = () => resolve();
                source.start();
            });
        };

        onSpeakingStart();
        audioPlaybackQueueRef.current = audioPlaybackQueueRef.current
            .then(playTask)
            .catch(() => {
                // ignore
            })
            .finally(() => {
                onSpeakingEnd();
            });
    }, [onSpeakingEnd, onSpeakingStart]);

    const cleanupAudioStreaming = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        void interruptRealtimeAudioPlayback();
    }, [interruptRealtimeAudioPlayback]);

    return {
        speakAssistantReply,
        playRealtimeAudio,
        interruptRealtimeAudioPlayback,
        cleanupAudioStreaming,
    };
};
