// ─── Vocab Content Types ──────────────────────────────────────────────────────
// Stored in Lesson.content (Schema.Types.Mixed)
// Every module type follows the same discriminated union pattern.

export interface VocabItem {
    id: string; // nanoid() — stable client-side key
    word: string;
    partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';
    ipa: string; // /ˈlʌɡ.ɪdʒ/
    definitionNative: string; // Mother-tongue definition — lang from Language.code
    definitionEn: string; // English definition
    exampleSentence: string; // MUST match Unit.contextSeed.scenario
    exampleTranslation: string;
    audioWordUrl: string | null; // R2 URL — TTS of the word
    audioSentenceUrl: string | null; // R2 URL — TTS of exampleSentence
    imageUrl: string | null; // Cloudinary or R2
    conceptId: string | null; // ObjectId → Concept collection (auto-mapped)
}

export type VocabGenerationStatus =
    | 'IDLE'
    | 'GENERATING' // GPT-5.1 generating JSON vocab
    | 'GENERATING_AUDIO' // BullMQ TTS processing audio files
    | 'DONE'
    | 'ERROR';

export interface VocabContent {
    type: 'VOCAB';
    scenario: string; // Copied from Unit.contextSeed.scenario at generation time
    generationStatus: VocabGenerationStatus;
    items: VocabItem[];
}

// ─── Grammar Content Types ────────────────────────────────────────────────────

export type HighlightType = 'regular_verb' | 'irregular_verb' | 'grammar_particle' | 'other';
export type FormulaType = 'positive' | 'negative' | 'question' | 'other';

export interface HighlightInfo {
    id: string;
    word: string;
    type: HighlightType;
    root: string;
}

export interface ContextStory {
    text: string;
    translation: string;
    audioUrl: string | null;
    highlights: HighlightInfo[];
}

export interface GrammarFormula {
    id: string;
    type: FormulaType;
    structure: string;
    example: string;
}

export interface IrregularVerb {
    id: string;
    base: string;
    past: string;
}

export interface GrammarRule {
    name: string;
    usage: string;
    formulas: GrammarFormula[];
    irregular_verbs: IrregularVerb[];
}

export type GrammarCalloutVariant = 'TIP' | 'WARNING' | 'EXAMPLE' | 'UNIT_CONTEXT';

export interface GrammarExampleItem {
    en: string;
    vi: string;
}

export interface GrammarInlineQuizQuestion {
    id: string;
    stem: string;
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK';
    options?: string[] | undefined;
    correct: string;
    acceptedAnswers?: string[] | undefined;
    explanation: string;
}

export interface GrammarExplanationBlock {
    id: string;
    type: 'EXPLANATION';
    heading: string;
    body: string;
    examples: GrammarExampleItem[];
    highlightPattern: string;
}

export interface GrammarInlineQuizBlock {
    id: string;
    type: 'INLINE_QUIZ';
    instruction: string;
    questions: GrammarInlineQuizQuestion[];
}

export interface GrammarCalloutBlock {
    id: string;
    type: 'CALLOUT';
    variant: GrammarCalloutVariant;
    text: string;
}

export interface GrammarUnitContextBlock {
    id: string;
    type: 'UNIT_CONTEXT_BLOCK';
    heading: string;
    note: string;
    examples: GrammarExampleItem[];
}

export type GrammarBlogBlock =
    | GrammarExplanationBlock
    | GrammarInlineQuizBlock
    | GrammarCalloutBlock
    | GrammarUnitContextBlock;

export interface GrammarHero {
    hook: string;
    contextSentences: string[];
}

export interface GrammarSummaryTable {
    columns: [string, string, string];
    rows: [string, string, string][];
}

export interface GrammarContent {
    type: 'GRAMMAR';
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    readingTime: number;
    conceptName: string;
    hero: GrammarHero;
    heroAudioUrl?: string | null;
    blocks: GrammarBlogBlock[];
    summaryTable: GrammarSummaryTable;
    practiceConfig: {
        mode: 'FIXED';
        questionIds: string[];
        passingScore: number;
    };
    taughtConcepts: string[];
}

// ─── Reading Content Types ────────────────────────────────────────────────────

export type ReadingPartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';

export interface ReadingGlossaryItem {
    word: string;               // Từ gốc xuất hiện trong <mark>
    definition: string;         // Nghĩa tiếng Việt (hoặc EN)
    type: ReadingPartOfSpeech;
    ipa: string;                // /ˈɪɡ.zæm.pəl/
}

export interface ReadingMedia {
    audioUrl: string | null;    // R2 URL — TTS narration of the passage
    durationSec: number;        // 0 nếu chưa tạo
    speed: number;              // Default 1.0
}

export interface ReadingContent {
    type: 'READING';
    text: string;               // HTML với <mark data-concept="gen_{n}">…</mark>
    translation: string;        // Bản dịch tiếng Việt của toàn bộ bài đọc
    glossary: Record<string, ReadingGlossaryItem>;  // key = data-concept value
    media: ReadingMedia;
    practiceConfig: {
        mode: 'FIXED';
        questionIds: string[];
        passingScore: number;
    };
    generationStatus: 'IDLE' | 'GENERATING' | 'GENERATING_AUDIO' | 'DONE' | 'ERROR';
}

// ─── Listening Content Types ──────────────────────────────────────────────────
// Stored in Lesson.content (Schema.Types.Mixed) when type = 'LISTENING'

export type ListeningAccent = 'en-US' | 'en-UK' | 'mixed';
export type ListeningNoiseLevel = 'none' | 'low' | 'medium' | 'high';
export type ListeningInteractiveMode = 'GAP_FILL' | 'SHADOWING';
export type ListeningGenerationStatus = 'IDLE' | 'GENERATING_SCRIPT' | 'GENERATING_AUDIO' | 'SYNCING' | 'DONE' | 'ERROR';

export interface AudioWord {
    word: string;
    start: number;         // seconds — e.g. 0.50 (populated by Deepgram in Phase 3)
    end: number;           // seconds — e.g. 0.83
    conceptId?: string | undefined;  // ObjectId ref → Concept collection (auto-mapped)
    isTargetVocab: boolean; // true → Gap-fill candidate; toggled by Admin in Karaoke editor
}

export interface TranscriptLine {
    id: string;            // UUID — stable client-side key for React rendering
    speaker: string;       // e.g. "Adam"
    role: string;          // e.g. "Airport Staff"
    text: string;          // Full dialogue line
    translation?: string;  // Optional translated line for admin review and learner support
    startTime: number;     // seconds — 0 until populated by Deepgram
    endTime: number;       // seconds — 0 until populated by Deepgram
    words: AudioWord[];    // [] until populated by AI Mix & Sync (Phase 3)
}

export interface ListeningMedia {
    audioUrl: string | null;          // Cloudflare R2 CDN URL — null until audio is generated
    duration: number;                 // seconds — 0 until audio is generated
    accent: ListeningAccent;
    noiseLevel: ListeningNoiseLevel;  // Simulate real-world audio environment
    speed: number;                    // Default 1.0
}

export interface ListeningInteractiveConfig {
    mode: ListeningInteractiveMode;
    hidePercentage: number;    // 0–100; percentage of target vocab to gap-fill
    allowSlowSpeed: boolean;
}

export interface ListeningContent {
    type: 'LISTENING';
    media: ListeningMedia;
    transcript: TranscriptLine[];     // [] until script is written
    interactiveConfig: ListeningInteractiveConfig;
    practiceConfig: {
        mode: 'FIXED';
        questionIds: string[];   // Comprehension question ObjectIds
        passingScore: number;
    };
    generationStatus: ListeningGenerationStatus;
}

// ─── Writing Content Types ───────────────────────────────────────────────────

export type WritingFormat = 'EMAIL' | 'ESSAY' | 'STORY' | 'CHAT';
export type WritingTone = 'FORMAL' | 'CASUAL' | 'NEUTRAL';

export interface WritingConfig {
    minWords: number;
    maxWords: number;
    format: WritingFormat;
    tone: WritingTone;
}

export interface WritingRequiredConcept {
    id: string;
    conceptId: string;
    keyword: string;
    points: number;
}

export interface WritingWarmupTask {
    id: string;
    type: 'UNSCRAMBLE';
    words: string[];
    correct: string;
}

export interface WritingContent {
    type: 'WRITING';
    prompt: string;
    promptTranslation: string;
    config: WritingConfig;
    requiredConcepts: WritingRequiredConcept[];
    requiredGrammar: string;
    sentenceStarters: string[];
    warmupTasks: WritingWarmupTask[];
    taughtConcepts: string[];
}

// ─── Union Type — extend as new lesson types are built ────────────────────────
export type LessonContent = VocabContent | GrammarContent | ReadingContent | ListeningContent | WritingContent;
