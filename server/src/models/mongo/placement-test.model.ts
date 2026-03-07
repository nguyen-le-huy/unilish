import mongoose from 'mongoose';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const EPlacementTestStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
} as const;

export const EModuleType = {
    MCQ: 'mcq',
    ESSAY: 'essay',
    SPEAKING: 'speaking',
} as const;

export const ECEFRLevel = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

export const ETargetAudience = {
    NEW_USER: 'new_user',
    RETAKE: 'retake',
    INVITATION: 'invitation',
} as const;

export const ESamplingMode = {
    RANDOM: 'random',
    FIXED: 'fixed',
} as const;

export const EPromptSource = {
    AI_GENERATED: 'ai_generated',
    LIBRARY: 'library',
} as const;

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface IPartConfig {
    part: number;
    name: string;
    questionsCount: number;
    poolTag: string;
    difficultyDistribution: Partial<Record<keyof typeof ECEFRLevel, number>>;
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
    samplingMode: 'random' | 'fixed';
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
    secureMode: { disablePaste: boolean; disableSpellcheck: boolean };
    promptSource: 'ai_generated' | 'library';
}

export interface ISpeakingParts {
    warmupMinutes: number;
    part1: { minutes: number; questionsRange: [number, number]; topics: string[] };
    part2: { minutes: number; prepSeconds: number; cueCards: { level: 'low' | 'mid' | 'high'; text: string }[] };
    part3: { minutes: number; questionsRange: [number, number]; topics: string[] };
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
    parts: ISpeakingParts;
}

export type IPlacementTestModule = IModuleMCQ | IModuleEssay | IModuleSpeaking;

export interface ICEFRThreshold {
    level: keyof typeof ECEFRLevel;
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

// ─── Main Document Interface ──────────────────────────────────────────────────

export interface IPlacementTest extends mongoose.Document {
    languageId: mongoose.Types.ObjectId;
    language: string;
    name: string;
    standard: string;
    outputFramework: string;
    description?: string;

    status: typeof EPlacementTestStatus[keyof typeof EPlacementTestStatus];
    version: number;

    settings: {
        targetAudience: (typeof ETargetAudience[keyof typeof ETargetAudience])[];
        allowRetake: boolean;
        retakeCooldownDays: number;
    };

    modules: IPlacementTestModule[];
    cefrMapping: ICEFRMapping;

    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const PartConfigSchema = new mongoose.Schema<IPartConfig>(
    {
        part: { type: Number, required: true },
        name: { type: String, required: true, trim: true },
        questionsCount: { type: Number, required: true, min: 1 },
        poolTag: { type: String, required: true, trim: true },
        difficultyDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
        excludeRecentDays: { type: Number, default: 30, min: 0 },
        topicFilter: { type: [String], default: [] },
        manualContent: {
            passageText: { type: String, default: null },
            groupPattern: { type: [Number], default: [] },
            questions: { type: [String], default: [] },
            questionItems: {
                type: [
                    {
                        question: { type: String, required: true, trim: true },
                        options: {
                            A: { type: String, required: true, trim: true },
                            B: { type: String, required: true, trim: true },
                            C: { type: String, required: true, trim: true },
                            D: { type: String, required: true, trim: true },
                        },
                        correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
                        explanation: { type: String, default: null },
                        transcript: { type: String, default: null },
                        mediaUrl: { type: String, default: null },
                        imageUrl: { type: String, default: null },
                        imageUrls: { type: [String], default: [] },
                        audioUrl: { type: String, default: null },
                    },
                ],
                default: [],
            },
            media: {
                imageUrl: { type: String, default: null },
                audioUrl: { type: String, default: null },
                videoUrl: { type: String, default: null },
            },
        },
    },
    { _id: false },
);

const ModuleMCQSchema = new mongoose.Schema<IModuleMCQ>(
    {
        order: { type: Number, required: true },
        type: { type: String, enum: ['mcq'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        showCountdown: { type: Boolean, default: true },
        allowBackNavigation: { type: Boolean, default: false },
        adaptive: { type: Boolean, default: true },
        samplingMode: { type: String, enum: Object.values(ESamplingMode), default: ESamplingMode.RANDOM },
        parts: { type: [PartConfigSchema], default: [] },
    },
    { _id: false },
);

const ModuleEssaySchema = new mongoose.Schema<IModuleEssay>(
    {
        order: { type: Number, required: true },
        type: { type: String, enum: ['essay'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        aiModel: { type: String, required: true, default: 'gpt-4o-mini' },
        criteria: { type: [String], default: ['TR', 'CC', 'LR', 'GRA'] },
        wordLimits: {
            low: { type: Number, default: 150 },
            mid: { type: Number, default: 200 },
            high: { type: Number, default: 250 },
        },
        topicsByLevel: {
            low: { type: [String], default: [] },
            mid: { type: [String], default: [] },
            high: { type: [String], default: [] },
        },
        secureMode: {
            disablePaste: { type: Boolean, default: true },
            disableSpellcheck: { type: Boolean, default: true },
        },
        promptSource: { type: String, enum: Object.values(EPromptSource), default: EPromptSource.AI_GENERATED },
    },
    { _id: false },
);

const SpeakingPartsSchema = new mongoose.Schema(
    {
        warmupMinutes: { type: Number, default: 1 },
        part1: {
            minutes: { type: Number, default: 5 },
            questionsRange: { type: [Number], default: [4, 6] },
            topics: { type: [String], default: ['Work', 'Study', 'Hobbies', 'Family'] },
        },
        part2: {
            minutes: { type: Number, default: 4 },
            prepSeconds: { type: Number, default: 60 },
            cueCards: {
                type: [
                    {
                        level: { type: String, enum: ['low', 'mid', 'high'] },
                        text: { type: String },
                    },
                ],
                default: [],
            },
        },
        part3: {
            minutes: { type: Number, default: 5 },
            questionsRange: { type: [Number], default: [2, 3] },
            topics: { type: [String], default: [] },
        },
    },
    { _id: false },
);

const ModuleSpeakingSchema = new mongoose.Schema<IModuleSpeaking>(
    {
        order: { type: Number, required: true },
        type: { type: String, enum: ['speaking'], required: true },
        name: { type: String, required: true, trim: true },
        totalMinutes: { type: Number, required: true, min: 1 },
        conversationModel: { type: String, default: 'gpt-4o-mini' },
        ttsModel: { type: String, default: 'tts-1' },
        ttsVoice: { type: String, default: 'alloy' },
        gradingModel: { type: String, default: 'gpt-4o-mini' },
        speechAnalytics: { type: String, default: 'azure-ai-speech' },
        silenceThresholdSeconds: { type: Number, default: 5 },
        criteria: { type: [String], default: ['fluency', 'lexical', 'grammar', 'pronunciation'] },
        parts: { type: SpeakingPartsSchema, default: () => ({}) },
    },
    { _id: false },
);

const CEFRThresholdSchema = new mongoose.Schema(
    {
        level: { type: String, enum: Object.values(ECEFRLevel), required: true },
        mcqMin: { type: Number, required: true },
        mcqMax: { type: Number, required: true },
        writingMin: { type: Number, default: 0 },
        writingMax: { type: Number, default: 1 },
        speakingMin: { type: Number, default: 0 },
        speakingMax: { type: Number, default: 1 },
    },
    { _id: false },
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const PlacementTestSchema = new mongoose.Schema<IPlacementTest>(
    {
        // ─── Identity ──────────────────────────────────────────────────────────
        languageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
            required: true,
            index: true,
        },
        language: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        standard: {
            type: String,
            required: true,
            trim: true,
        },
        outputFramework: {
            type: String,
            required: true,
            default: 'CEFR',
        },
        description: {
            type: String,
            default: null,
        },

        // ─── Config ────────────────────────────────────────────────────────────
        status: {
            type: String,
            enum: Object.values(EPlacementTestStatus),
            default: EPlacementTestStatus.DRAFT,
            index: true,
        },
        version: {
            type: Number,
            default: 1,
            min: 1,
        },
        settings: {
            targetAudience: {
                type: [String],
                enum: Object.values(ETargetAudience),
                default: [ETargetAudience.NEW_USER],
            },
            allowRetake: { type: Boolean, default: false },
            retakeCooldownDays: { type: Number, default: 30, min: 0 },
        },

        // ─── Modules (polymorphic) ─────────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modules: { type: [], default: [] } as any,

        // ─── CEFR Mapping ──────────────────────────────────────────────────────
        cefrMapping: {
            weights: {
                mcq: { type: Number, default: 0.4, min: 0, max: 1 },
                writing: { type: Number, default: 0.3, min: 0, max: 1 },
                speaking: { type: Number, default: 0.3, min: 0, max: 1 },
            },
            thresholds: { type: [CEFRThresholdSchema], default: [] },
        },

        // ─── Audit ─────────────────────────────────────────────────────────────
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

PlacementTestSchema.index({ languageId: 1, status: 1 });
PlacementTestSchema.index({ language: 1, status: 1 });
PlacementTestSchema.index({ version: -1 });
PlacementTestSchema.index({ language: 1, name: 1 });

// ─── Export ───────────────────────────────────────────────────────────────────

export const PlacementTest = mongoose.model<IPlacementTest>('PlacementTest', PlacementTestSchema);
