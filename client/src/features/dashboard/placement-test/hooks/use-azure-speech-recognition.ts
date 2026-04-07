import { useCallback, useRef, useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { AzurePronunciationAssessmentResult } from '../types/azure-speech.types';

interface UseAzureSpeechRecognitionResult {
    startRecognition: () => Promise<void>;
    stopRecognition: () => Promise<AzurePronunciationAssessmentResult | null>;
    isRecognizing: boolean;
    error: string | null;
}

const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

/**
 * Hook for Azure Speech Recognition with Pronunciation Assessment
 * Runs in background - NO live transcript display
 * Captures: AccuracyScore, FluencyScore, PronScore, word/phoneme errors
 */
export const useAzureSpeechRecognition = (): UseAzureSpeechRecognitionResult => {
    const recognizerRef = useRef<sdk.SpeechRecognizer | null>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Store accumulated pronunciation results
    const resultsRef = useRef<AzurePronunciationAssessmentResult[]>([]);

    const startRecognition = useCallback(async () => {
        if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
            setError('Azure Speech credentials not configured');
            return;
        }

        try {
            // Configure Azure Speech
            const speechConfig = sdk.SpeechConfig.fromSubscription(
                AZURE_SPEECH_KEY,
                AZURE_SPEECH_REGION
            );
            speechConfig.speechRecognitionLanguage = 'en-US';

            // Configure Pronunciation Assessment
            const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
                '',  // Empty reference text for unscripted speech
                sdk.PronunciationAssessmentGradingSystem.HundredMark,
                sdk.PronunciationAssessmentGranularity.Phoneme,
                true // Enable miscue (word error detection)
            );
            
            // Enable prosody assessment (optional - newer SDK versions only)
            // Skip type checking as this method may not exist in all SDK versions
            try {
                (pronunciationConfig as any).enableProsodyAssessment?.();
            } catch {
                // Prosody assessment not available
            }

            // Create recognizer from microphone
            const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            
            // Apply pronunciation assessment config
            pronunciationConfig.applyTo(recognizer);
            
            recognizerRef.current = recognizer;
            resultsRef.current = [];
            setError(null);

            // Event: Recognized (final result for each phrase)
            recognizer.recognized = (_sender, event) => {
                if (event.result.reason === sdk.ResultReason.RecognizedSpeech) {
                    const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(event.result);
                    
                    if (pronunciationResult) {
                        const result: AzurePronunciationAssessmentResult = {
                            pronunciationScore: pronunciationResult.pronunciationScore,
                            accuracyScore: pronunciationResult.accuracyScore,
                            fluencyScore: pronunciationResult.fluencyScore,
                            completenessScore: pronunciationResult.completenessScore,
                            prosodyScore: (pronunciationResult as any).prosodyScore, // May not be available in all versions
                        };

                        // Extract word-level details
                        const jsonResult = event.result.properties.getProperty(
                            sdk.PropertyId.SpeechServiceResponse_JsonResult
                        );
                        
                        if (jsonResult) {
                            try {
                                const parsed = JSON.parse(jsonResult);
                                const nBest = parsed.NBest?.[0];
                                
                                if (nBest) {
                                    result.wpm = nBest.PronunciationAssessment?.WPM;
                                    result.duration = event.result.duration / 10000; // Convert to milliseconds
                                    
                                    // Extract word-level data
                                    if (nBest.Words && Array.isArray(nBest.Words)) {
                                        result.words = nBest.Words.map((word: any) => ({
                                            word: word.Word,
                                            accuracyScore: word.PronunciationAssessment?.AccuracyScore,
                                            errorType: word.PronunciationAssessment?.ErrorType || 'None',
                                            phonemes: word.Phonemes?.map((phoneme: any) => ({
                                                phoneme: phoneme.Phoneme,
                                                accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore,
                                            })),
                                        }));
                                    }
                                }
                            } catch {
                                // Ignore JSON parse errors
                            }
                        }

                        resultsRef.current.push(result);
                    }
                }
            };

            // Event: Error
            recognizer.canceled = (_sender, event) => {
                if (event.reason === sdk.CancellationReason.Error) {
                    setError(`Azure Speech error: ${event.errorDetails}`);
                }
            };

            // Start continuous recognition
            await recognizer.startContinuousRecognitionAsync();
            setIsRecognizing(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsRecognizing(false);
        }
    }, []);

    const stopRecognition = useCallback(async (): Promise<AzurePronunciationAssessmentResult | null> => {
        const recognizer = recognizerRef.current;
        
        if (!recognizer) {
            setIsRecognizing(false);
            return null;
        }

        return new Promise((resolve) => {
            recognizer.stopContinuousRecognitionAsync(
                () => {
                    recognizer.close();
                    recognizerRef.current = null;
                    setIsRecognizing(false);

                    // Aggregate results into single object
                    const aggregatedResult = aggregateResults(resultsRef.current);
                    resultsRef.current = [];
                    
                    resolve(aggregatedResult);
                },
                (error) => {
                    setError(`Stop recognition error: ${error}`);
                    recognizer.close();
                    recognizerRef.current = null;
                    setIsRecognizing(false);
                    resolve(null);
                }
            );
        });
    }, []);

    return {
        startRecognition,
        stopRecognition,
        isRecognizing,
        error,
    };
};

/**
 * Aggregate multiple pronunciation results into a single summary
 */
const aggregateResults = (
    results: AzurePronunciationAssessmentResult[]
): AzurePronunciationAssessmentResult | null => {
    if (results.length === 0) {
        return null;
    }

    // Calculate averages for numeric scores
    const scores: Record<string, number[]> = {
        pronunciationScore: [],
        accuracyScore: [],
        fluencyScore: [],
        completenessScore: [],
        prosodyScore: [],
        wpm: [],
    };

    let totalDuration = 0;
    const allWords: AzurePronunciationAssessmentResult['words'] = [];

    results.forEach((result) => {
        if (result.pronunciationScore != null) scores.pronunciationScore.push(result.pronunciationScore);
        if (result.accuracyScore != null) scores.accuracyScore.push(result.accuracyScore);
        if (result.fluencyScore != null) scores.fluencyScore.push(result.fluencyScore);
        if (result.completenessScore != null) scores.completenessScore.push(result.completenessScore);
        if (result.prosodyScore != null) scores.prosodyScore.push(result.prosodyScore);
        if (result.wpm != null) scores.wpm.push(result.wpm);
        if (result.duration != null) totalDuration += result.duration;
        if (result.words) allWords.push(...result.words);
    });

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

    return {
        pronunciationScore: avg(scores.pronunciationScore),
        accuracyScore: avg(scores.accuracyScore),
        fluencyScore: avg(scores.fluencyScore),
        completenessScore: avg(scores.completenessScore),
        prosodyScore: avg(scores.prosodyScore),
        wpm: avg(scores.wpm),
        duration: totalDuration > 0 ? totalDuration : undefined,
        words: allWords.length > 0 ? allWords : undefined,
    };
};
