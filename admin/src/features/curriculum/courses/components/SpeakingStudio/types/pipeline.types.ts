export type PttStatus =
    | 'idle'
    | 'recording'
    | 'processing'
    | 'ai_speaking'
    | 'error';

export interface SttResult {
    transcript: string;
    durationMs: number;
}

export interface LlmResult {
    reply: string;
    latencyMs: number;
    tokenUsage: number;
    model: string;
    requestedModel: string;
    usedFallback: boolean;
}

export type PhonemeErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';

export type WordErrorType =
    | 'None'
    | 'Omission'
    | 'Insertion'
    | 'Mispronunciation'
    | 'UnexpectedBreak'
    | 'MissingBreak';

export interface PhonemeScore {
    phoneme: string;
    accuracyScore: number;
    errorType: PhonemeErrorType;
}

export interface WordScore {
    word: string;
    accuracyScore: number;
    errorType: WordErrorType;
    phonemes: PhonemeScore[];
}

export interface PronunciationResult {
    accuracyScore: number;
    fluencyScore: number;
    prosodyScore: number;
    completenessScore: number;
    pronunciationScore: number;
    recognizedText: string;
    words: WordScore[];
}

export interface TurnResult {
    stt: SttResult | null;
    llm: LlmResult | null;
    pronunciation: PronunciationResult | null;
    error: string | null;
}
