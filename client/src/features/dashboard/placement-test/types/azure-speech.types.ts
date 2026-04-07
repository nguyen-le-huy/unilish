/**
 * Azure Speech Service - Pronunciation Assessment Types
 * Reference: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment
 */

export interface AzurePronunciationAssessmentResult {
    /**
     * Overall pronunciation score (0-100)
     */
    pronunciationScore?: number;

    /**
     * Accuracy score indicating how closely the phonemes match native pronunciation (0-100)
     */
    accuracyScore?: number;

    /**
     * Fluency score indicating speech smoothness (0-100)
     */
    fluencyScore?: number;

    /**
     * Completeness score (percentage of words spoken vs reference text, 0-100)
     */
    completenessScore?: number;

    /**
     * Prosody score indicating stress and intonation naturalness (0-100)
     * Available in newer API versions
     */
    prosodyScore?: number;

    /**
     * Words per minute (speaking rate)
     */
    wpm?: number;

    /**
     * Total duration in milliseconds
     */
    duration?: number;

    /**
     * Individual word-level assessment
     */
    words?: Array<{
        word: string;
        accuracyScore?: number;
        errorType?: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
        
        /**
         * Phoneme-level breakdown
         */
        phonemes?: Array<{
            phoneme: string;
            accuracyScore?: number;
        }>;
    }>;
}

/**
 * Serializable pronunciation data to send to server
 * Server expects: Record<string, unknown>
 */
export type PronunciationDataPayload = Record<string, unknown>;
