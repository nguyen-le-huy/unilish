export interface DeepgramUtteranceWord {
    word?: string;
    start?: number;
    end?: number;
    speaker?: number;
}

export interface DeepgramUtterance {
    transcript?: string;
    start?: number;
    end?: number;
    words?: DeepgramUtteranceWord[];
    speaker?: number;
}

interface SentenceSegment {
    text: string;
    startMs: number;
    endMs: number;
}

const SENTENCE_BOUNDARY_REGEX = /(?<!\.\.)(?<=[.!?])\s+(?=[A-Z"])/g;
const WORD_TOKEN_REGEX = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

const toMilliseconds = (seconds: number): number => Math.max(0, Math.round(seconds * 1000));

const countSentenceWords = (text: string): number => {
    const tokens = text.match(WORD_TOKEN_REGEX);
    return tokens?.length ?? 0;
};

const trimSentence = (text: string): string => text.trim();

export const splitUtteranceIntoSentences = (utterance: DeepgramUtterance): SentenceSegment[] => {
    const rawText = utterance.transcript?.trim() ?? '';
    if (rawText.length === 0) {
        return [];
    }

    const startSeconds = utterance.start ?? 0;
    const endSeconds = Math.max(startSeconds, utterance.end ?? startSeconds);
    const utteranceStartMs = toMilliseconds(startSeconds);
    const utteranceEndMs = toMilliseconds(endSeconds);
    const sentences = rawText.split(SENTENCE_BOUNDARY_REGEX).map(trimSentence).filter((text) => text.length > 0);

    if (sentences.length <= 1) {
        return [{ text: rawText, startMs: utteranceStartMs, endMs: utteranceEndMs }];
    }

    const words = utterance.words ?? [];
    if (words.length === 0) {
        const durationMs = Math.max(0, utteranceEndMs - utteranceStartMs);
        return sentences.map((text, index) => {
            const startMs = utteranceStartMs + Math.round((durationMs * index) / sentences.length);
            const endMs = utteranceStartMs + Math.round((durationMs * (index + 1)) / sentences.length);
            return { text, startMs, endMs: Math.max(startMs, endMs) };
        });
    }

    let wordCursor = 0;

    return sentences.map((text, index) => {
        const sentenceWordCount = countSentenceWords(text);
        const remainingSentences = sentences.length - index;
        const remainingWords = Math.max(words.length - wordCursor, 1);
        const targetWordCount = sentenceWordCount > 0
            ? sentenceWordCount
            : Math.max(1, Math.floor(remainingWords / remainingSentences));

        const firstWordIndex = Math.min(wordCursor, words.length - 1);
        const lastWordIndex = Math.min(firstWordIndex + targetWordCount - 1, words.length - 1);
        const firstWord = words[firstWordIndex];
        const lastWord = words[lastWordIndex];

        wordCursor = lastWordIndex + 1;

        const startMs = toMilliseconds(firstWord?.start ?? startSeconds);
        const endMs = toMilliseconds(lastWord?.end ?? endSeconds);

        return {
            text,
            startMs,
            endMs: Math.max(startMs, endMs),
        };
    });
};
