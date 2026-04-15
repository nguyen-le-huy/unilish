// ─── Enums ───────────────────────────────────────────────────────────────────

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const LESSON_TYPES = [
    'VOCAB',
    'GRAMMAR',
    'READING',
    'LISTENING',
    'SPEAKING',
    'WRITING',
    'UNIT_TEST',
] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const PRACTICE_MODES = ['FIXED', 'DYNAMIC'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface StructureMatrix {
    vocabCount?: number;
    grammarCount?: number;
    readingTaskCount?: number;
    listeningTaskCount?: number;
    writingTaskCount?: number;
    speakingTaskCount?: number;
}

export interface FinalExamConfig {
    durationMinutes: number;
    passScore: number;
    structureMatrix: StructureMatrix;
    questionPool: {
        readingLessonIds: string[];
        listeningLessonIds: string[];
    };
}

export interface ContextSeed {
    scenario?: string;
    keywords: string[];
    culturalNotes?: string;
}

export interface PracticeConfig {
    mode: PracticeMode;
    questionIds: string[];
    dynamicRules: {
        quantity: number;
        difficulty: number;
    };
    passingScore: number;
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Course {
    _id: string;
    seriesId: string;
    name: string;
    level: CEFRLevel;
    orderInSeries: number;
    totalUnits: number;
    isActive: boolean;
    prerequisiteCourseId?: string | null;
    finalExamConfig: FinalExamConfig;
    createdAt: string;
    updatedAt: string;
}

export interface Unit {
    _id: string;
    courseId: string;
    title: string;
    orderIndex: number;
    description?: string | null;
    thumbnailUrl?: string | null;
    contextSeed: ContextSeed;
    vectorId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LessonSummary {
    _id: string;
    unitId: string;
    title: string;
    type: LessonType;
    orderIndex: number;
    practiceConfig: Pick<PracticeConfig, 'mode' | 'passingScore'>;
    createdAt: string;
    updatedAt: string;
}

// ─── Tree DTOs (for Studio) ───────────────────────────────────────────────────

export interface UnitWithLessons extends Unit {
    lessons: LessonSummary[];
}

export interface CourseTreeDTO extends Course {
    units: UnitWithLessons[];
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface CreateCoursePayload {
    seriesId: string;
    name: string;
    level: CEFRLevel;
    orderInSeries: number;
    prerequisiteCourseId?: string | null;
    finalExamConfig?: Partial<FinalExamConfig>;
}

export interface UpdateCoursePayload {
    name?: string;
    level?: CEFRLevel;
    orderInSeries?: number;
    prerequisiteCourseId?: string | null;
    finalExamConfig?: Partial<FinalExamConfig>;
    isActive?: boolean;
}

export interface CreateUnitPayload {
    courseId: string;
    title: string;
    description?: string;
    thumbnailUrl?: string | null;
    contextSeed?: Partial<ContextSeed>;
}

export interface UpdateUnitPayload {
    title?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    contextSeed?: Partial<ContextSeed>;
}

export interface CreateLessonPayload {
    unitId: string;
    title: string;
    type: LessonType;
    practiceConfig?: Partial<PracticeConfig>;
}

export interface UpdateLessonPayload {
    title?: string;
    type?: LessonType;
    practiceConfig?: Partial<PracticeConfig>;
}

export interface ReorderUnitsPayload {
    courseId: string;
    orderedIds: string[];
}

export interface ReorderLessonsPayload {
    unitId: string;
    orderedIds: string[];
}

// ─── Query filters ────────────────────────────────────────────────────────────

export interface CourseListQuery {
    seriesId: string;
    isActive?: boolean;
}

// ─── Vocab Content Types ──────────────────────────────────────────────────────

export const VOCAB_PARTS_OF_SPEECH = [
    'noun',
    'verb',
    'adjective',
    'adverb',
    'phrase',
    'preposition',
    'conjunction',
    'other',
] as const;
export type VocabPartOfSpeech = (typeof VOCAB_PARTS_OF_SPEECH)[number];

export type VocabGenerationStatus =
    | 'IDLE'
    | 'GENERATING'
    | 'GENERATING_AUDIO'
    | 'DONE'
    | 'ERROR';

export interface VocabItem {
    id: string;
    word: string;
    partOfSpeech: VocabPartOfSpeech;
    ipa: string;
    definitionNative: string;
    definitionEn: string;
    exampleSentence: string;
    exampleTranslation: string;
    audioWordUrl: string | null;
    audioSentenceUrl: string | null;
    imageUrl: string | null;
    conceptId: string | null;
}

export interface VocabContent {
    type: 'VOCAB';
    scenario: string;
    generationStatus: VocabGenerationStatus;
    items: VocabItem[];
}

export interface VocabStatusResponse {
    status: VocabGenerationStatus;
    completedCount: number;
    totalCount: number;
}

// ─── Pronunciation Assessment Types ──────────────────────────────────────────

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

export interface WordPronunciationScore {
    word: string;
    accuracyScore: number;
    errorType: WordErrorType;
    phonemes: PhonemeScore[];
}

export interface PronunciationAssessmentResult {
    accuracyScore: number;
    fluencyScore: number;
    prosodyScore: number;
    completenessScore: number;
    pronunciationScore: number;
    words: WordPronunciationScore[];
    recognizedText: string;
}

export type PronunciationTestStatus =
    | 'idle'
    | 'recording'
    | 'processing'
    | 'done'
    | 'error';

// ─── Vocab Mutation Payloads ──────────────────────────────────────────────────

export interface GenerateVocabPayload {
    wordCount?: number;
    wordList?: string[];
}

export interface SaveVocabContentPayload {
    scenario: string;
    generationStatus: VocabGenerationStatus;
    items: VocabItem[];
}

export interface RegenerateAudioPayload {
    target: 'word' | 'sentence';
}

// ─── Practice Question Types ───────────────────────────────────────────────────

export const QUESTION_TYPES = [
    'MULTIPLE_CHOICE',
    'FILL_IN_BLANK',
    'ERROR_CORRECTION',
    'TRUE_FALSE',
    'MATCHING',
    'PRONUNCIATION',
    'ESSAY',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface QuestionStem {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
}

export interface MCOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface MCContent {
    options: MCOption[];
}

export interface FillContent {
    correctAnswers: string[];
}

export interface MatchPair {
    id: string;
    word: string;
    definition: string;
}

export interface MatchContent {
    pairs: MatchPair[];
}

export interface IQuestion {
    _id: string;
    languageId: string;
    testedConcept: string;
    type: QuestionType;
    difficultyLevel: number;
    stem: QuestionStem;
    content: MCContent | FillContent | MatchContent;
    explanation?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface UpdateQuestionPayload {
    stem?: Partial<QuestionStem>;
    explanation?: string | null;
    difficultyLevel?: number;
    content?: Record<string, unknown>;
}

// ─── Grammar Content Types ────────────────────────────────────────────────────

export const CALLOUT_VARIANTS = ['TIP', 'WARNING', 'EXAMPLE', 'UNIT_CONTEXT'] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

export interface GrammarExampleItem {
    en: string;
    vi: string;
}

export interface GrammarInlineQuizQuestion {
    id: string;
    stem: string;
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK';
    options?: string[];
    correct: string;
    acceptedAnswers?: string[];
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
    variant: CalloutVariant;
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

export interface GrammarFinalPracticeConfig {
    mode: 'FIXED';
    questionIds: string[];
    passingScore: number;
}

export interface GrammarBlogQuestion {
    _id: string;
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'ERROR_CORRECTION';
    stem: { text?: string; audioUrl?: string | null; imageUrl?: string | null };
    content: {
        options?: { id: string; text: string; isCorrect: boolean }[];
        correctAnswers?: string[];
        pairs?: { id: string; word: string; definition: string }[];
        errorWord?: string | null;
        correction?: string | null;
        isCorrect?: boolean;
    };
    explanation?: string;
    difficultyLevel: number;
    tags: string[];
}

export type HighlightType = 'regular_verb' | 'irregular_verb' | 'grammar_particle' | 'other';

export interface HighlightInfo {
    id: string;
    word: string;        // word as it appears in the story: "booked"
    type: HighlightType;
    root: string;        // base form: "book"
}

export interface ContextStory {
    text: string;
    translation: string;
    audioUrl: string | null;
    highlights: HighlightInfo[];
}

export type FormulaType = 'positive' | 'negative' | 'question' | 'other';

export interface GrammarFormula {
    id: string;
    type: FormulaType;
    structure: string;   // "S + V-ed/V2"
    example: string;
}

export interface IrregularVerb {
    id: string;
    base: string;   // "lose"
    past: string;   // "lost"
}

export interface GrammarRule {
    name: string;
    usage: string;
    formulas: GrammarFormula[];
    irregular_verbs: IrregularVerb[];
}

export interface GrammarContent {
    type: 'GRAMMAR';
    level: CEFRLevel;
    readingTime: number;
    conceptName: string;
    hero: GrammarHero;
    blocks: GrammarBlogBlock[];
    summaryTable: GrammarSummaryTable;
    practiceConfig: GrammarFinalPracticeConfig;
    taughtConcepts: string[];
}

// ─── Grammar Form Values (react-hook-form root model) ─────────────────────────
// Used as the single form shape owned by GrammarStudio.

export interface GrammarLessonFormValues {
    level: CEFRLevel;
    readingTime: number;
    conceptName: string;
    hero: GrammarHero;
    blocks: GrammarBlogBlock[];
    summaryTable: GrammarSummaryTable;
    practiceConfig: {
        mode: 'FIXED';
        passingScore: number;
    };
    taughtConcepts: string[];
}

// ─── Grammar API Payloads ─────────────────────────────────────────────────────

export interface SaveGrammarContentPayload {
    level: CEFRLevel;
    readingTime: number;
    conceptName: string;
    hero: GrammarHero;
    blocks: GrammarBlogBlock[];
    summaryTable: GrammarSummaryTable;
    practiceConfig: {
        mode: 'FIXED';
        passingScore: number;
    };
    taughtConcepts: string[];
}

export interface GenerateGrammarStoryPayload {
    grammarName: string;
    level: CEFRLevel;
    selectedVocab: string[];   // ["luggage", "passport"]
}

export interface GenerateGrammarStoryResponse {
    level: CEFRLevel;
    readingTime: number;
    conceptName: string;
    hero: GrammarHero;
    blocks: GrammarBlogBlock[];
    summaryTable: GrammarSummaryTable;
}

export interface GrammarQuestionsResponse {
    questionIds: string[];
    count: number;
}

// ─── Grammar Question Review Board types ─────────────────────────────────────

export interface GrammarMCOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface GrammarQuestionCard {
    _id: string;
    type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'ERROR_CORRECTION';
    stem: { text?: string; audioUrl?: string | null; imageUrl?: string | null };
    content: {
        options?: GrammarMCOption[];
        correctAnswers?: string[];
        pairs?: { id: string; word: string; definition: string }[];
        errorWord?: string | null;
        correction?: string | null;
        isCorrect?: boolean;
    };
    explanation?: string;
    difficultyLevel: number;
    tags: string[];
}

export interface UpdateGrammarQuestionPayload {
    stem?: { text?: string };
    explanation?: string | null;
    difficultyLevel?: number;
    content?: Record<string, unknown>;
}

// ─── Reading Content Types ────────────────────────────────────────────────────

export type ReadingPartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';

export interface ReadingGlossaryItem {
    word: string;
    definition: string;       // Vietnamese definition
    type: ReadingPartOfSpeech;
    ipa: string;              // /ˈɪɡ.zæm.pəl/
}

export interface ReadingMedia {
    audioUrl: string | null;
    durationSec: number;
    speed: number;
}

export type ReadingGenerationStatus = 'IDLE' | 'GENERATING' | 'GENERATING_AUDIO' | 'DONE' | 'ERROR';

export interface ReadingContent {
    type: 'READING';
    text: string;             // HTML with <mark data-concept="gen_n">…</mark>
    translation: string;      // Bản dịch tiếng Việt
    glossary: Record<string, ReadingGlossaryItem>;
    media: ReadingMedia;
    practiceConfig: {
        mode: 'FIXED';
        questionIds: string[];
        passingScore: number;
    };
    generationStatus: ReadingGenerationStatus;
}

// ─── Reading Form Values (react-hook-form root model) ─────────────────────────

export interface ReadingLessonFormValues {
    text: string;
    translation: string;
    glossary: Record<string, ReadingGlossaryItem>;
    media: ReadingMedia;
    practiceConfig: {
        mode: 'FIXED';
        passingScore: number;
    };
}

// ─── Reading API Payloads ─────────────────────────────────────────────────────

export interface SaveReadingContentPayload {
    text: string;
    translation?: string;
    glossary: Record<string, ReadingGlossaryItem>;
    media?: ReadingMedia;
    practiceConfig?: {
        mode: 'FIXED';
        passingScore: number;
    };
    generationStatus?: ReadingGenerationStatus;
}

export type ReadingGenerationPayload = {
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    textType: 'email' | 'report' | 'news' | 'story';
    wordCount?: number;
    topic?: string;
};

export interface ReadingQuestionsResponse {
    questionIds: string[];
    count: number;
}

// ─── Reading Question Review types (reuses Grammar card shape) ────────────────

export type ReadingQuestionCard = GrammarQuestionCard;

export interface UpdateReadingQuestionPayload {
    stem?: { text?: string };
    explanation?: string | null;
    difficultyLevel?: number;
    content?: Record<string, unknown>;
}

// ─── Listening Content Types ──────────────────────────────────────────────────

export type ListeningAccent = 'en-US' | 'en-UK' | 'mixed';
export type ListeningNoiseLevel = 'none' | 'low' | 'medium' | 'high';
export type ListeningInteractiveMode = 'GAP_FILL' | 'SHADOWING';
export type ListeningGenerationStatus =
    | 'IDLE'
    | 'GENERATING_SCRIPT'
    | 'GENERATING_AUDIO'
    | 'SYNCING'
    | 'DONE'
    | 'ERROR';

export type ListeningScriptFormat = 'DIALOGUE' | 'PODCAST' | 'NEWS';

export interface AudioWord {
    word: string;
    start: number;           // seconds
    end: number;             // seconds
    conceptId?: string | undefined;
    isTargetVocab: boolean;  // true → Gap-fill candidate
}

export interface TranscriptLine {
    id: string;              // UUID — stable React key
    speaker: string;         // e.g. "Adam"
    role: string;            // e.g. "Airport Staff"
    text: string;            // Full dialogue line
    translation?: string;    // Optional translated line
    startTime: number;       // 0 until Deepgram sync
    endTime: number;         // 0 until Deepgram sync
    words: AudioWord[];      // [] until Mix & Sync (Phase 3)
}

export interface ListeningMedia {
    audioUrl: string | null;
    duration: number;
    accent: ListeningAccent;
    noiseLevel: ListeningNoiseLevel;
    speed: number;
}

export interface ListeningInteractiveConfig {
    mode: ListeningInteractiveMode;
    hidePercentage: number;  // 0–100
    allowSlowSpeed: boolean;
}

export interface ListeningContent {
    type: 'LISTENING';
    media: ListeningMedia;
    transcript: TranscriptLine[];
    interactiveConfig: ListeningInteractiveConfig;
    practiceConfig: {
        mode: 'FIXED';
        questionIds: string[];
        passingScore: number;
    };
    generationStatus: ListeningGenerationStatus;
}

// ─── Listening Form Values (react-hook-form root model) ───────────────────────

export interface ListeningLessonFormValues {
    media: ListeningMedia;
    transcript: TranscriptLine[];
    interactiveConfig: ListeningInteractiveConfig;
    practiceConfig: {
        mode: 'FIXED';
        passingScore: number;
    };
}

// ─── Listening API Payloads ───────────────────────────────────────────────────

export interface SaveListeningContentPayload {
    media?: Partial<ListeningMedia>;
    transcript?: TranscriptLine[];
    interactiveConfig?: Partial<ListeningInteractiveConfig>;
    practiceConfig?: {
        mode: 'FIXED';
        passingScore: number;
    };
    generationStatus?: ListeningGenerationStatus;
}

export interface GenerateListeningScriptPayload {
    lineCount?: number;
    speakerCount?: number;
    scriptFormat?: ListeningScriptFormat;
    topic?: string;
}

export interface MixAndSyncPayload {
    speakerVoiceMap?: Record<string, string>;
}

export interface SyncStatusResponse {
    status:
        | 'IDLE'
        | 'GENERATING_SCRIPT'
        | 'GENERATING_AUDIO'
        | 'SYNCING'
        | 'DONE'
        | 'ERROR';
    progress: number;
    result?: {
        audioUrl: string | null;
        duration: number;
        transcript: TranscriptLine[];
    };
}

export interface ListeningQuestionsResponse {
    questionIds: string[];
    count: number;
}

export interface GenerateListeningQuestionsPayload {
    distribution: {
        multipleChoice: number;
        fillInBlank: number;
        trueFalse: number;
    };
}

export interface ListeningQuestionCard {
    _id: string;
    type: QuestionType;
    stem: { text?: string; audioUrl?: string | null; imageUrl?: string | null };
    content: {
        options?: GrammarMCOption[];
        correctAnswers?: string[];
        pairs?: { id: string; word: string; definition: string }[];
    };
    explanation?: string;
    difficultyLevel: number;
    tags: string[];
}

export interface UpdateListeningQuestionPayload {
    stem?: { text?: string };
    explanation?: string | null;
    difficultyLevel?: number;
    content?: Record<string, unknown>;
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

export interface RequiredConcept {
    id: string;
    conceptId: string;
    keyword: string;
    points: number;
}

export interface WarmupTask {
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
    requiredConcepts: RequiredConcept[];
    requiredGrammar: string;
    sentenceStarters: string[];
    warmupTasks: WarmupTask[];
    taughtConcepts: string[];
}

export interface WritingLessonFormValues {
    prompt: string;
    promptTranslation: string;
    config: WritingConfig;
    requiredConcepts: RequiredConcept[];
    requiredGrammar: string;
    sentenceStarters: string[];
    warmupTasks: WarmupTask[];
    taughtConcepts: string[];
}

export type SaveWritingContentPayload = WritingLessonFormValues;

export interface GenerateWritingMissionPayload {
    level: CEFRLevel;
    format: WritingFormat;
    tone: WritingTone;
    minWords: number;
    maxWords: number;
    topic?: string;
}

export interface TestDriveGradePayload {
    submission: string;
}

export interface TestDriveGradeResponse {
    taskCompletionScore: number;
    grammarFeedback: string;
    nativeRewrite: string;
    explanation: string;
}
