// ─── Enums ────────────────────────────────────────────────────────────────────

export type PlacementTestStatus = 'draft' | 'active' | 'paused' | 'archived';

export type ModuleType = 'mcq' | 'essay' | 'speaking';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type TargetAudience = 'new_user' | 'retake' | 'invitation';
export type SamplingMode = 'random' | 'fixed';
export type PromptSource = 'ai_generated' | 'library';

// ─── Config Sub-types ─────────────────────────────────────────────────────────

export interface IPartConfig {
    part: number;
    name: string;
    questionsCount: number;
    poolTag: string;
    difficultyDistribution: Partial<Record<CEFRLevel, number>>;
    excludeRecentDays: number;
    topicFilter?: string[];
    manualContent?: {
        passageText?: string;
        groupPattern?: number[];
        questions?: string[];
        questionItems?: Array<{
            question: string;
            options: {
                A: string;
                B: string;
                C: string;
                D: string;
            };
            correctOption: 'A' | 'B' | 'C' | 'D';
            explanation?: string;
            transcript?: string;
            mediaUrl?: string;
            imageUrl?: string;
            imageUrls?: string[];
            audioUrl?: string;
        }>;
        media?: {
            imageUrl?: string;
            audioUrl?: string;
            videoUrl?: string;
        };
    };
}

export interface IModuleMCQ {
    order: number;
    type: 'mcq';
    name: string;
    timeLimitMinutes: number;
    showCountdown: boolean;
    allowBackNavigation: boolean;
    adaptive: boolean;
    samplingMode: SamplingMode;
    parts: IPartConfig[];
}

export interface IModuleEssay {
    order: number;
    type: 'essay';
    name: string;
    timeLimitMinutes: number;
    aiModel: string;
    criteria: string[];
    wordLimits: { low: number; mid: number; high: number };
    topicsByLevel: { low: string[]; mid: string[]; high: string[] };
    promptImageUrl?: string;
    secureMode: { disablePaste: boolean; disableSpellcheck: boolean };
    promptSource: PromptSource;
}

export interface ISpeakingCueCard {
    level: 'low' | 'mid' | 'high';
    text: string;
    audioKey?: string;
    shouldSay?: string[];
}

/** A speaking question stored with optional audio reference */
export interface ISpeakingQuestion {
    text: string;
    audioKey?: string;
}

export interface IModuleSpeaking {
    order: number;
    type: 'speaking';
    name: string;
    totalMinutes: number;
    conversationModel: string;
    ttsModel: string;
    ttsVoice: string;
    gradingModel: string;
    speechAnalytics: string;
    silenceThresholdSeconds: number;
    criteria: string[];
    parts: {
        warmupMinutes: number;
        part1: { minutes: number; questionsRange: [number, number]; topics: ISpeakingQuestion[] };
        part2: { minutes: number; prepSeconds: number; cueCards: ISpeakingCueCard[] };
        part3: { minutes: number; questionsRange: [number, number]; topics: ISpeakingQuestion[] };
    };
}

export type IPlacementTestModule = IModuleMCQ | IModuleEssay | IModuleSpeaking;

export interface ICEFRThreshold {
    level: CEFRLevel;
    mcqMin: number;
    mcqMax: number;
    writingMin: number;
    writingMax: number;
    speakingMin: number;
    speakingMax: number;
}

export interface ICEFRMapping {
    weights: { mcq: number; writing: number; speaking: number };
    thresholds: ICEFRThreshold[];
}

// ─── Main Model ───────────────────────────────────────────────────────────────

export interface IPlacementTest {
    _id: string;
    languageId: string;
    language: string;
    name: string;
    standard: string;
    outputFramework: string;
    description?: string;
    status: PlacementTestStatus;
    version: number;
    settings: {
        targetAudience: TargetAudience[];
        allowRetake: boolean;
        retakeCooldownDays: number;
    };
    modules: IPlacementTestModule[];
    cefrMapping: ICEFRMapping;
    createdBy?: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

// ─── List & Pagination ────────────────────────────────────────────────────────

export type IPlacementTestSummary = Pick<
    IPlacementTest,
    '_id' | 'languageId' | 'language' | 'name' | 'standard' | 'outputFramework' | 'status' | 'version' | 'settings' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
> & {
    moduleCount?: number;
};

export interface IPaginatedPlacementTests {
    data: IPlacementTestSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface IPlacementTestFilters {
    page?: number;
    limit?: number;
    search?: string;
    language?: string;
    status?: PlacementTestStatus;
}

// ─── Payloads (API Request Bodies) ───────────────────────────────────────────

export type ICreatePlacementTestPayload = {
    languageId: string;
    language: string;
    name: string;
    standard: string;
    outputFramework?: string;
    description?: string;
    settings?: {
        targetAudience: TargetAudience[];
        allowRetake: boolean;
        retakeCooldownDays: number;
    };
    modules?: IPlacementTestModule[];
    cefrMapping?: ICEFRMapping;
};

export type IUpdatePlacementTestPayload = Partial<
    Omit<ICreatePlacementTestPayload, 'languageId' | 'language'>
>;

export interface IUpdateStatusPayload {
    status: 'active' | 'paused' | 'archived';
}

// ─── Pool Validation ──────────────────────────────────────────────────────────

export interface IPoolPartValidation {
    part: number;
    name: string;
    poolTag: string;
    required: number;
    minimumPool: number;
    publishedCount: number;
    isValid: boolean;
}

export interface IPoolModuleValidation {
    moduleIndex: number;
    moduleName: string;
    type: ModuleType;
    parts?: IPoolPartValidation[];
}

export interface IPoolValidationResult {
    isValid: boolean;
    modules: IPoolModuleValidation[];
}

// ─── Version History ──────────────────────────────────────────────────────────

export interface IVersionHistoryItem {
    _id: string;
    version: number;
    status: PlacementTestStatus;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface IAnalyticsSummary {
    totalAttempts: number;
    completedAttempts: number;
    dropoutRate: number;
    avgDurationMinutes: number;
    cefrDistribution: Partial<Record<CEFRLevel, number>>;
    skillScores: {
        listening?: number;
        reading?: number;
        writing?: number;
        speaking?: number;
    };
    moduleDropoutRates?: { moduleName: string; rate: number }[];
}

// ─── AI Parsing ──────────────────────────────────────────────────────────────

export interface AiImportedQuestion {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    transcript?: string;
    explanation?: string;
}

// ─── Push to Question Bank ──────────────────────────────────────────────────

export interface IPushToQuestionBankResult {
    inserted: number;
    skipped: number;
}

export interface IPushToQuestionBankPayload {
    status: 'draft' | 'published';
}
