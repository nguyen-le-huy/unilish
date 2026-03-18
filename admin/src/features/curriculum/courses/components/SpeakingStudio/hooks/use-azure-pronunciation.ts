import { useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { fetchAzureSpeechToken } from '@/features/curriculum/courses/api/azure-speech.api';
import { createPronunciationConfig, createSpeechConfigFromToken } from '@/lib/azure-speech';
import type {
    PhonemeErrorType,
    PhonemeScore,
    PronunciationResult,
    WordErrorType,
    WordScore,
} from '../types/pipeline.types';

const TOKEN_QUERY_KEY = ['azure-speech', 'token', 'speaking-sandbox'] as const;
// Azure WebSocket handshake + audio decode can take 10–12s on cold start
const ASSESS_TIMEOUT_MS = 15000;
const FAILURE_COOLDOWN_MS = 2 * 60 * 1000;

type AzurePronunciationNode = {
    AccuracyScore?: number;
    ErrorType?: string;
};

type AzurePhonemeNode = {
    Phoneme?: string;
    PronunciationAssessment?: AzurePronunciationNode;
};

type AzureWordNode = {
    Word?: string;
    PronunciationAssessment?: AzurePronunciationNode;
    Phonemes?: AzurePhonemeNode[];
};

type AzureNBestNode = {
    Words?: AzureWordNode[];
};

type AzureDetailedResult = {
    NBest?: AzureNBestNode[];
};

const toPhonemeErrorType = (value: string | undefined): PhonemeErrorType => {
    if (value === 'Omission' || value === 'Insertion' || value === 'Mispronunciation') {
        return value;
    }
    return 'None';
};

const toWordErrorType = (value: string | undefined): WordErrorType => {
    if (
        value === 'Omission'
        || value === 'Insertion'
        || value === 'Mispronunciation'
        || value === 'UnexpectedBreak'
        || value === 'MissingBreak'
    ) {
        return value;
    }
    return 'None';
};

const safeParseDetailedResult = (raw: string): AzureDetailedResult | null => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }
        return parsed as AzureDetailedResult;
    } catch {
        return null;
    }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
    for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
        output.setInt16(offset + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
};

const writeString = (view: DataView, offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index));
    }
};

const encodeWav = (audioBuffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const sourceChannel = audioBuffer.getChannelData(0);
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const buffer = new ArrayBuffer(44 + sourceChannel.length * bytesPerSample);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + sourceChannel.length * bytesPerSample, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, sourceChannel.length * bytesPerSample, true);
    floatTo16BitPCM(view, 44, sourceChannel);

    return buffer;
};

const toWavArrayBuffer = async (blob: Blob): Promise<ArrayBuffer> => {
    const context = new AudioContext();
    try {
        const audioData = await blob.arrayBuffer();
        const decoded = await context.decodeAudioData(audioData.slice(0));
        return encodeWav(decoded);
    } finally {
        await context.close();
    }
};

const mapWords = (rawWords: AzureWordNode[]): WordScore[] => {
    return rawWords.map((word): WordScore => {
        const phonemes: PhonemeScore[] = (word.Phonemes ?? []).map((phoneme) => ({
            phoneme: phoneme.Phoneme ?? '',
            accuracyScore: Math.round(phoneme.PronunciationAssessment?.AccuracyScore ?? 0),
            errorType: toPhonemeErrorType(phoneme.PronunciationAssessment?.ErrorType),
        }));

        return {
            word: word.Word ?? '',
            accuracyScore: Math.round(word.PronunciationAssessment?.AccuracyScore ?? 0),
            errorType: toWordErrorType(word.PronunciationAssessment?.ErrorType),
            phonemes,
        };
    });
};

interface UseAzurePronunciationReturn {
    assess: (audioBlob: Blob, referenceText: string) => Promise<PronunciationResult | null>;
}

export const useAzurePronunciation = (): UseAzurePronunciationReturn => {
    const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
    const consecutiveFailuresRef = useRef(0);
    const cooldownUntilRef = useRef(0);
    // Guard flag: prevent concurrent assessments that cause WebSocket loop
    const isAssessingRef = useRef(false);

    const { data: tokenData, refetch: refetchToken } = useQuery({
        queryKey: TOKEN_QUERY_KEY,
        queryFn: fetchAzureSpeechToken,
        staleTime: 9 * 60 * 1000,
        retry: 1,
        enabled: false,
    });

    const closeRecognizer = useCallback(() => {
        const r = recognizerRef.current;
        if (r) {
            try {
                r.close();
            } catch {
                // ignore — recognizer may already be in closing state
            }
        }
        recognizerRef.current = null;
    }, []);

    const assess = useCallback(async (audioBlob: Blob, referenceText: string): Promise<PronunciationResult | null> => {
        // Prevent concurrent WebSocket sessions which cause the retry loop
        if (isAssessingRef.current) {
            return null;
        }
        if (!referenceText.trim()) {
            return null;
        }

        if (Date.now() < cooldownUntilRef.current) {
            return null;
        }

        // Close any lingering recognizer from a previous call before starting
        closeRecognizer();
        isAssessingRef.current = true;

        try {
            const tokenResult = tokenData ? { data: tokenData } : await refetchToken();
            const token = tokenResult.data;

            if (!token) {
                return null;
            }

            const speechConfig = createSpeechConfigFromToken(token);
            const pronunciationConfig = createPronunciationConfig(referenceText);
            const wavBuffer = await toWavArrayBuffer(audioBlob);
            const wavFile = new File([wavBuffer], 'recording.wav', { type: 'audio/wav' });
            const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(wavFile);

            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            recognizerRef.current = recognizer;
            pronunciationConfig.applyTo(recognizer);

            const result = await new Promise<PronunciationResult | null>((resolve) => {
                let resolved = false;
                const timeoutId = window.setTimeout(() => {
                    if (resolved) {
                        return;
                    }
                    resolved = true;
                    closeRecognizer();
                    resolve(null);
                }, ASSESS_TIMEOUT_MS);

                recognizer.recognizeOnceAsync(
                    (recognitionResult) => {
                        if (resolved) {
                            return;
                        }
                        resolved = true;
                        window.clearTimeout(timeoutId);
                        const assessment = SpeechSDK.PronunciationAssessmentResult.fromResult(recognitionResult);
                        const rawJson = recognitionResult.properties.getProperty(
                            SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult,
                        );
                        const detail = safeParseDetailedResult(rawJson);
                        const rawWords = detail?.NBest?.[0]?.Words ?? [];

                        resolve({
                            accuracyScore: Math.round(assessment.accuracyScore),
                            fluencyScore: Math.round(assessment.fluencyScore),
                            prosodyScore: Math.round(assessment.prosodyScore),
                            completenessScore: Math.round(assessment.completenessScore),
                            pronunciationScore: Math.round(assessment.pronunciationScore),
                            words: mapWords(rawWords),
                            recognizedText: recognitionResult.text ?? '',
                        });
                    },
                    () => {
                        if (resolved) {
                            return;
                        }
                        resolved = true;
                        window.clearTimeout(timeoutId);
                        resolve(null);
                    },
                );
            });

            if (result) {
                consecutiveFailuresRef.current = 0;
                return result;
            }

            consecutiveFailuresRef.current += 1;
            if (consecutiveFailuresRef.current >= 3) {
                cooldownUntilRef.current = Date.now() + FAILURE_COOLDOWN_MS;
                consecutiveFailuresRef.current = 0;
            }

            return result;
        } finally {
            // Always release guard + recognizer, even if an exception is thrown
            closeRecognizer();
            isAssessingRef.current = false;
        }
    }, [closeRecognizer, refetchToken, tokenData]);

    return { assess };
};
