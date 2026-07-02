// ─── Learner-safe content types (no answer-bearing fields) ────────────────────

// VOCAB
export interface LearnerVocabItem {
    id: string;
    word: string;
    partOfSpeech: string;
    ipa: string;
    definitionNative: string;
    definitionEn: string;
    exampleSentence: string;
    exampleTranslation: string;
    audioWordUrl: string | null;
    audioSentenceUrl: string | null;
    imageUrl: string | null;
}

export interface LearnerVocabContent {
    type: 'VOCAB';
    scenario: string;
    items: LearnerVocabItem[];
}

// GRAMMAR
export interface LearnerGrammarExample {
    en: string;
    vi: string;
}

export interface LearnerGrammarHero {
    hook: string;
    contextSentences: string[];
}

export interface LearnerGrammarBlock {
    id: string;
    type: 'EXPLANATION' | 'CALLOUT' | 'UNIT_CONTEXT_BLOCK';
    heading?: string;
    body?: string;
    text?: string;
    note?: string;
    variant?: string;
    examples?: LearnerGrammarExample[];
    highlightPattern?: string;
}

export interface LearnerGrammarSummaryTable {
    columns: [string, string, string];
    rows: [string, string, string][];
}

export interface LearnerGrammarContent {
    type: 'GRAMMAR';
    conceptName: string;
    hero: LearnerGrammarHero;
    blocks: LearnerGrammarBlock[];
    summaryTable: LearnerGrammarSummaryTable;
    taughtConcepts: string[];
}

// READING
export interface LearnerReadingGlossaryItem {
    word: string;
    definition: string;
    type: string;
    ipa: string;
}

export interface LearnerReadingContent {
    type: 'READING';
    text: string;
    translation: string;
    glossary: Record<string, LearnerReadingGlossaryItem>;
    media: {
        audioUrl: string | null;
        durationSec: number;
    };
}

// LISTENING
export interface LearnerTranscriptWord {
    word: string;
    start: number;
    end: number;
    isTargetVocab: boolean;
}

export interface LearnerTranscriptLine {
    id: string;
    speaker: string;
    role: string;
    text: string;
    translation?: string;
    startTime: number;
    endTime: number;
    words: LearnerTranscriptWord[];
}

export interface LearnerListeningContent {
    type: 'LISTENING';
    media: {
        audioUrl: string | null;
        duration: number;
        accent: string;
    };
    transcript: LearnerTranscriptLine[];
    interactiveConfig: {
        mode: 'GAP_FILL' | 'SHADOWING';
        hidePercentage: number;
        allowSlowSpeed: boolean;
    };
}

// SPEAKING
export interface LearnerSpeakingHint {
    vi?: string;
    en?: string;
    structure?: string;
}

export interface LearnerSpeakingContent {
    type: 'SPEAKING';
    missionTitle: string;
    missionDescription: string;
    hints: LearnerSpeakingHint[];
}

// WRITING
export interface LearnerWritingContent {
    type: 'WRITING';
    prompt: string;
    promptTranslation: string;
    config: {
        minWords: number;
        maxWords: number;
        format: string;
        tone: string;
    };
    requiredConcepts: Array<{ keyword: string; points: number }>;
    requiredGrammar: string;
    sentenceStarters: string[];
    warmupTasks: Array<{
        id: string;
        type: 'UNSCRAMBLE';
        words: string[];
    }>;
    taughtConcepts: string[];
}

// UNIT_TEST
export interface LearnerUnitTestContent {
    type: 'UNIT_TEST';
    questions: Array<{
        id: string;
        stem?: string;
        type: string;
    }>;
}

export type LearnerContent =
    | LearnerVocabContent
    | LearnerGrammarContent
    | LearnerReadingContent
    | LearnerListeningContent
    | LearnerSpeakingContent
    | LearnerWritingContent
    | LearnerUnitTestContent;
