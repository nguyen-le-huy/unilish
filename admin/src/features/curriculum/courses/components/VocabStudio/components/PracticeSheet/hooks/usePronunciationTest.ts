import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { fetchAzureSpeechToken } from '@/features/curriculum/courses/api/azure-speech.api';
import {
    createPronunciationConfig,
    createSpeechConfigFromToken,
} from '@/lib/azure-speech';
import type {
    PhonemeErrorType,
    PhonemeScore,
    PronunciationAssessmentResult,
    PronunciationTestStatus,
    WordErrorType,
    WordPronunciationScore,
} from '@/features/curriculum/courses/types/course.types';

const TOKEN_QUERY_KEY = ['azure-speech', 'token'] as const;

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

function toPhonemeErrorType(value: string | undefined): PhonemeErrorType {
    if (value === 'Omission' || value === 'Insertion' || value === 'Mispronunciation') {
        return value;
    }
    return 'None';
}

function toWordErrorType(value: string | undefined): WordErrorType {
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
}

function safeParseDetailedResult(raw: string): AzureDetailedResult | null {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed !== 'object' || parsed === null) {
            return null;
        }
        return parsed as AzureDetailedResult;
    } catch {
        return null;
    }
}

function mapWords(rawWords: AzureWordNode[]): WordPronunciationScore[] {
    return rawWords.map((word): WordPronunciationScore => {
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
}

interface UsePronunciationTestReturn {
    status: PronunciationTestStatus;
    result: PronunciationAssessmentResult | null;
    error: string | null;
    startTest: (referenceText: string) => Promise<void>;
    stopTest: () => void;
    reset: () => void;
}

export function usePronunciationTest(): UsePronunciationTestReturn {
    const [status, setStatus] = useState<PronunciationTestStatus>('idle');
    const [result, setResult] = useState<PronunciationAssessmentResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

    const { data: tokenData, refetch: refetchToken } = useQuery({
        queryKey: TOKEN_QUERY_KEY,
        queryFn: fetchAzureSpeechToken,
        staleTime: 9 * 60 * 1000,
        retry: 1,
        enabled: false,
    });

    const closeRecognizer = useCallback(() => {
        recognizerRef.current?.close();
        recognizerRef.current = null;
    }, []);

    const startTest = useCallback(async (referenceText: string) => {
        if (!referenceText.trim()) {
            setError('Từ vựng trống, không thể chấm phát âm.');
            setStatus('error');
            return;
        }

        if (status === 'recording' || status === 'processing') {
            return;
        }

        setStatus('recording');
        setResult(null);
        setError(null);

        try {
            const queryResult = tokenData ? { data: tokenData } : await refetchToken();
            const token = queryResult.data;

            if (!token) {
                throw new Error('Cannot get Azure Speech token');
            }

            const speechConfig = createSpeechConfigFromToken(token);
            const pronunciationConfig = createPronunciationConfig(referenceText);
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

            pronunciationConfig.applyTo(recognizer);
            recognizerRef.current = recognizer;

            recognizer.recognizeOnceAsync(
                (recognitionResult) => {
                    setStatus('processing');

                    const assessment = SpeechSDK.PronunciationAssessmentResult.fromResult(recognitionResult);
                    const rawJson = recognitionResult.properties.getProperty(
                        SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult,
                    );
                    const detail = safeParseDetailedResult(rawJson);
                    const rawWords = detail?.NBest?.[0]?.Words ?? [];

                    const mapped: PronunciationAssessmentResult = {
                        accuracyScore: Math.round(assessment.accuracyScore),
                        fluencyScore: Math.round(assessment.fluencyScore),
                        prosodyScore: Math.round(assessment.prosodyScore),
                        completenessScore: Math.round(assessment.completenessScore),
                        pronunciationScore: Math.round(assessment.pronunciationScore),
                        words: mapWords(rawWords),
                        recognizedText: recognitionResult.text ?? '',
                    };

                    setResult(mapped);
                    setStatus('done');
                    closeRecognizer();
                },
                (errorMessage) => {
                    setError(errorMessage || 'Không thể nhận diện phát âm.');
                    setStatus('error');
                    closeRecognizer();
                },
            );
        } catch (caughtError: unknown) {
            const message = caughtError instanceof Error ? caughtError.message : 'Lỗi không xác định';
            setError(message);
            setStatus('error');
            closeRecognizer();
        }
    }, [closeRecognizer, refetchToken, status, tokenData]);

    const stopTest = useCallback(() => {
        closeRecognizer();
        setStatus('idle');
    }, [closeRecognizer]);

    const reset = useCallback(() => {
        closeRecognizer();
        setStatus('idle');
        setResult(null);
        setError(null);
    }, [closeRecognizer]);

    useEffect(() => () => closeRecognizer(), [closeRecognizer]);

    return {
        status,
        result,
        error,
        startTest,
        stopTest,
        reset,
    };
}
