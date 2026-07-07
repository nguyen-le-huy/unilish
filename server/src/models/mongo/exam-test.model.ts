import mongoose from 'mongoose';

export const EExamFormat = {
    TOEIC_LR: 'toeic_lr',
    IELTS: 'ielts',
} as const;

export const EExamTestStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
} as const;

export const EExamScoringFramework = {
    TOEIC_SCORE: 'toeic_score',
    IELTS_BAND: 'ielts_band',
} as const;

export const EExamTestKind = {
    FULL_EXAM: 'full_exam',
    SKILL_PRACTICE: 'skill_practice',
} as const;

export const EIeltsSkill = {
    LISTENING: 'listening',
    READING: 'reading',
    WRITING: 'writing',
    SPEAKING: 'speaking',
} as const;

export const EIeltsQuestionType = {
    FORM_COMPLETION: 'form_completion',
    TRUE_FALSE_NOT_GIVEN: 'true_false_not_given',
    ACADEMIC_TASK_1_CHART: 'academic_task_1_chart',
    AI_CONVERSATION: 'ai_conversation',
} as const;

export interface IExamQuestionItem {
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
    transcript?: string;
    audioUrl?: string;
    imageUrl?: string;
    imageUrls?: string[];
}

export interface IExamPartConfig {
    part: number;
    name: string;
    questionsCount: number;
    poolTag: string;
    manualContent?: {
        questionItems?: IExamQuestionItem[];
        audioUrl?: string;
        groupPattern?: number[];
    };
}

export interface IExamModuleListening {
    type: 'listening';
    name: string;
    timeLimitMinutes: number;
    audioUrl?: string;
    parts: IExamPartConfig[];
}

export interface IExamModuleReading {
    type: 'reading';
    name: string;
    timeLimitMinutes: number;
    parts: IExamPartConfig[];
}

export interface IExamWritingTask {
    task: 1 | 2;
    minWords: number;
    topics: string[];
}

export interface IExamModuleWriting {
    type: 'writing';
    name: string;
    timeLimitMinutes: number;
    tasks: IExamWritingTask[];
}

export interface IExamSpeakingTopic {
    text: string;
    audioKey?: string;
}

export interface IExamSpeakingCueCard {
    text: string;
    shouldSay?: string[];
    audioKey?: string;
}

export interface IExamModuleSpeaking {
    type: 'speaking';
    name: string;
    part1Topics: IExamSpeakingTopic[];
    part2CueCards: IExamSpeakingCueCard[];
    part3Topics: IExamSpeakingTopic[];
}

export type IExamModule =
    | IExamModuleListening
    | IExamModuleReading
    | IExamModuleWriting
    | IExamModuleSpeaking;

export interface IExamBandThreshold {
    band: string;
    minScore: number;
    maxScore: number;
}

export interface IExamScoringConfig {
    framework: typeof EExamScoringFramework[keyof typeof EExamScoringFramework];
    bandThresholds: IExamBandThreshold[];
}

export interface IExamTestSettings {
    allowRetake: boolean;
    retakeCooldownDays: number;
    timeLimitOverrideMinutes?: number;
}

export interface IExamTest extends mongoose.Document {
    name: string;
    format: typeof EExamFormat[keyof typeof EExamFormat];
    kind: typeof EExamTestKind[keyof typeof EExamTestKind];
    logicalTestId?: mongoose.Types.ObjectId;
    slug?: string;
    languageId: mongoose.Types.ObjectId;
    language: string;
    description?: string;
    status: typeof EExamTestStatus[keyof typeof EExamTestStatus];
    version: number;
    skill?: typeof EIeltsSkill[keyof typeof EIeltsSkill];
    questionType?: typeof EIeltsQuestionType[keyof typeof EIeltsQuestionType];
    durationMinutes?: number;
    itemCount?: number;
    modules: IExamModule[];
    content?: Record<string, unknown>;
    scoringConfig: IExamScoringConfig;
    settings: IExamTestSettings;
    publishedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ExamQuestionItemSchema = new mongoose.Schema<IExamQuestionItem>(
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
        audioUrl: { type: String, default: null },
        imageUrl: { type: String, default: null },
        imageUrls: { type: [String], default: [] },
    },
    { _id: false },
);

const ExamPartConfigSchema = new mongoose.Schema<IExamPartConfig>(
    {
        part: { type: Number, required: true, min: 1 },
        name: { type: String, required: true, trim: true },
        questionsCount: { type: Number, required: true, min: 1 },
        poolTag: { type: String, required: true, trim: true },
        manualContent: {
            questionItems: { type: [ExamQuestionItemSchema], default: [] },
            audioUrl: { type: String, default: null },
            groupPattern: { type: [Number], default: [] },
        },
    },
    { _id: false },
);

const ExamModuleListeningSchema = new mongoose.Schema<IExamModuleListening>(
    {
        type: { type: String, enum: ['listening'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        audioUrl: { type: String, default: null },
        parts: { type: [ExamPartConfigSchema], default: [] },
    },
    { _id: false, strict: false },
);

const ExamModuleReadingSchema = new mongoose.Schema<IExamModuleReading>(
    {
        type: { type: String, enum: ['reading'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        parts: { type: [ExamPartConfigSchema], default: [] },
    },
    { _id: false, strict: false },
);

const ExamModuleWritingSchema = new mongoose.Schema<IExamModuleWriting>(
    {
        type: { type: String, enum: ['writing'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        tasks: {
            type: [
                {
                    task: { type: Number, enum: [1, 2], required: true },
                    minWords: { type: Number, required: true, min: 1 },
                    topics: { type: [String], default: [] },
                },
            ],
            default: [],
        },
    },
    { _id: false, strict: false },
);

const ExamModuleSpeakingSchema = new mongoose.Schema<IExamModuleSpeaking>(
    {
        type: { type: String, enum: ['speaking'], required: true },
        name: { type: String, required: true, trim: true },
        part1Topics: {
            type: [
                {
                    text: { type: String, required: true, trim: true },
                    audioKey: { type: String, default: null },
                },
            ],
            default: [],
        },
        part2CueCards: {
            type: [
                {
                    text: { type: String, required: true, trim: true },
                    shouldSay: { type: [String], default: [] },
                    audioKey: { type: String, default: null },
                },
            ],
            default: [],
        },
        part3Topics: {
            type: [
                {
                    text: { type: String, required: true, trim: true },
                    audioKey: { type: String, default: null },
                },
            ],
            default: [],
        },
    },
    { _id: false, strict: false },
);

const ExamBandThresholdSchema = new mongoose.Schema<IExamBandThreshold>(
    {
        band: { type: String, required: true, trim: true },
        minScore: { type: Number, required: true, min: 0, max: 1 },
        maxScore: { type: Number, required: true, min: 0, max: 1 },
    },
    { _id: false },
);

const ExamScoringConfigSchema = new mongoose.Schema<IExamScoringConfig>(
    {
        framework: {
            type: String,
            enum: Object.values(EExamScoringFramework),
            required: true,
        },
        bandThresholds: { type: [ExamBandThresholdSchema], default: [] },
    },
    { _id: false },
);

const ExamTestSettingsSchema = new mongoose.Schema<IExamTestSettings>(
    {
        allowRetake: { type: Boolean, default: false },
        retakeCooldownDays: { type: Number, default: 30, min: 0 },
        timeLimitOverrideMinutes: { type: Number, default: null, min: 1 },
    },
    { _id: false },
);

const ExamModuleSchema = new mongoose.Schema<Record<string, unknown>>(
    {
        type: {
            type: String,
            enum: ['listening', 'reading', 'writing', 'speaking'],
            required: true,
        },
    },
    { _id: false, strict: false },
);

ExamModuleSchema.discriminator('listening', ExamModuleListeningSchema);
ExamModuleSchema.discriminator('reading', ExamModuleReadingSchema);
ExamModuleSchema.discriminator('writing', ExamModuleWritingSchema);
ExamModuleSchema.discriminator('speaking', ExamModuleSpeakingSchema);

const ExamTestSchema = new mongoose.Schema<IExamTest>(
    {
        name: { type: String, required: true, trim: true },
        format: { type: String, enum: Object.values(EExamFormat), required: true, index: true },
        kind: { type: String, enum: Object.values(EExamTestKind), default: EExamTestKind.FULL_EXAM, index: true },
        logicalTestId: { type: mongoose.Schema.Types.ObjectId, default: null },
        slug: { type: String, trim: true, lowercase: true, default: null },
        languageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true, index: true },
        language: { type: String, required: true, trim: true, index: true },
        description: { type: String, default: null },
        status: { type: String, enum: Object.values(EExamTestStatus), default: EExamTestStatus.DRAFT, index: true },
        version: { type: Number, default: 1, min: 1 },
        skill: { type: String, enum: Object.values(EIeltsSkill), default: null },
        questionType: { type: String, enum: Object.values(EIeltsQuestionType), default: null },
        durationMinutes: { type: Number, default: null, min: 1 },
        itemCount: { type: Number, default: null, min: 0 },
        modules: { type: [ExamModuleSchema], default: [] },
        content: { type: mongoose.Schema.Types.Mixed, default: null },
        scoringConfig: { type: ExamScoringConfigSchema, required: true },
        settings: { type: ExamTestSettingsSchema, required: true },
        publishedAt: { type: Date, default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'examtests' },
);

ExamTestSchema.index({ format: 1, status: 1 });
ExamTestSchema.index({ language: 1, format: 1 });
ExamTestSchema.index({ name: 1, format: 1, version: -1 });
ExamTestSchema.index({ name: 1, format: 1 });
ExamTestSchema.index({ kind: 1, format: 1, skill: 1, status: 1, publishedAt: -1 });
ExamTestSchema.index({ logicalTestId: 1, version: -1 }, { unique: true, sparse: true });
ExamTestSchema.index({ slug: 1, status: 1 });
ExamTestSchema.index({ languageId: 1, kind: 1, skill: 1 });

export const ExamTest = mongoose.model<IExamTest>('ExamTest', ExamTestSchema);
