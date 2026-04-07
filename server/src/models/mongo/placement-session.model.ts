import mongoose from 'mongoose';

export const EPlacementSessionStatus = {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
} as const;

export const EPlacementSessionModule = {
    LR: 'lr',
    WRITING: 'writing',
    SPEAKING: 'speaking',
    RESULT: 'result',
} as const;

export const EPlacementSubmoduleStatus = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    PENDING: 'pending',
    DONE: 'done',
} as const;

export type WritingLevel = 'low' | 'mid' | 'high';

export interface IWritingCriteria {
    TR?: number;
    CC?: number;
    LR?: number;
    GRA?: number;
}

export interface IWritingFeedback {
    strengths?: string[];
    errors?: string[];
    tips?: string[];
}

export interface ISpeakingCriteria {
    fluency?: number;
    lexical?: number;
    grammar?: number;
    pronunciation?: number;
}

export interface ISpeakingFeedback {
    strengths?: string[];
    errors?: string[];
    tips?: string[];
    transcriptHighlights?: string[];
}

export interface IPlacementSession extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    placementTestId: mongoose.Types.ObjectId;
    lrAttemptId: mongoose.Types.ObjectId;
    lrRawScore: number;
    lrScoring: {
        listeningRawPercent: number;
        readingRawPercent: number;
        provisionalCefr: string;
    };
    status: typeof EPlacementSessionStatus[keyof typeof EPlacementSessionStatus];
    currentModule: typeof EPlacementSessionModule[keyof typeof EPlacementSessionModule];
    writing: {
        moduleSnapshot?: {
            timeLimitMinutes: number;
            wordLimits: { low: number; mid: number; high: number };
            topicsByLevel: { low: string[]; mid: string[]; high: string[] };
            promptImageUrl?: string | null;
        } | null;
        attemptId?: string | null;
        level?: WritingLevel | null;
        prompt?: string | null;
        promptImageUrl?: string | null;
        timeLimitMinutes?: number | null;
        wordLimit?: number | null;
        status: typeof EPlacementSubmoduleStatus[keyof typeof EPlacementSubmoduleStatus];
        essay?: string | null;
        wordCount?: number | null;
        durationSeconds?: number | null;
        band?: number | null;
        criteria?: IWritingCriteria | null;
        feedback?: IWritingFeedback | null;
    };
    speaking: {
        attemptId?: string | null;
        status: typeof EPlacementSubmoduleStatus[keyof typeof EPlacementSubmoduleStatus];
        part1Qs: Array<{ text: string; audioKey?: string }>;
        cueCard?: { text: string; audioKey?: string; shouldSay?: string[] } | null;
        part3Qs: Array<{ text: string; audioKey?: string }>;
        config?: {
            ttsVoice?: string;
            gradingModel?: string;
            silenceThresholdSeconds?: number;
        } | null;
        audioChunks: Array<{
            part: 1 | 2 | 3;
            questionIdx: number;
            byteSize: number;
            mimeType?: string | null;
            transcript?: string | null;
            pronunciationData?: Record<string, unknown> | null;
            uploadedAt: Date;
        }>;
        band?: number | null;
        criteria?: ISpeakingCriteria | null;
        feedback?: ISpeakingFeedback | null;
    };
    overallFeedback?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const WritingCriteriaSchema = new mongoose.Schema<IWritingCriteria>(
    {
        TR: { type: Number, min: 0, max: 9, default: null },
        CC: { type: Number, min: 0, max: 9, default: null },
        LR: { type: Number, min: 0, max: 9, default: null },
        GRA: { type: Number, min: 0, max: 9, default: null },
    },
    { _id: false },
);

const WritingFeedbackSchema = new mongoose.Schema<IWritingFeedback>(
    {
        strengths: { type: [String], default: [] },
        errors: { type: [String], default: [] },
        tips: { type: [String], default: [] },
    },
    { _id: false },
);

const SpeakingCriteriaSchema = new mongoose.Schema<ISpeakingCriteria>(
    {
        fluency: { type: Number, min: 0, max: 9, default: null },
        lexical: { type: Number, min: 0, max: 9, default: null },
        grammar: { type: Number, min: 0, max: 9, default: null },
        pronunciation: { type: Number, min: 0, max: 9, default: null },
    },
    { _id: false },
);

const SpeakingFeedbackSchema = new mongoose.Schema<ISpeakingFeedback>(
    {
        strengths: { type: [String], default: [] },
        errors: { type: [String], default: [] },
        tips: { type: [String], default: [] },
        transcriptHighlights: { type: [String], default: [] },
    },
    { _id: false },
);

const PlacementSessionSchema = new mongoose.Schema<IPlacementSession>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        placementTestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlacementTest',
            required: true,
            index: true,
        },
        lrAttemptId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PlacementTestAttempt',
            required: true,
            index: true,
        },
        lrRawScore: { type: Number, required: true, min: 0, max: 100 },
        lrScoring: {
            listeningRawPercent: { type: Number, required: true, min: 0, max: 100 },
            readingRawPercent: { type: Number, required: true, min: 0, max: 100 },
            provisionalCefr: { type: String, required: true, trim: true },
        },
        status: {
            type: String,
            enum: Object.values(EPlacementSessionStatus),
            default: EPlacementSessionStatus.IN_PROGRESS,
            index: true,
        },
        currentModule: {
            type: String,
            enum: Object.values(EPlacementSessionModule),
            default: EPlacementSessionModule.WRITING,
            index: true,
        },
        writing: {
            moduleSnapshot: {
                type: {
                    timeLimitMinutes: { type: Number, required: true, min: 1 },
                    wordLimits: {
                        low: { type: Number, required: true, min: 1 },
                        mid: { type: Number, required: true, min: 1 },
                        high: { type: Number, required: true, min: 1 },
                    },
                    topicsByLevel: {
                        low: { type: [String], default: [] },
                        mid: { type: [String], default: [] },
                        high: { type: [String], default: [] },
                    },
                    promptImageUrl: { type: String, default: null },
                },
                default: null,
            },
            attemptId: { type: String, default: null },
            level: { type: String, enum: ['low', 'mid', 'high'], default: null },
            prompt: { type: String, default: null },
            promptImageUrl: { type: String, default: null },
            timeLimitMinutes: { type: Number, default: null, min: 1 },
            wordLimit: { type: Number, default: null, min: 1 },
            status: {
                type: String,
                enum: Object.values(EPlacementSubmoduleStatus),
                default: EPlacementSubmoduleStatus.NOT_STARTED,
            },
            essay: { type: String, default: null },
            wordCount: { type: Number, default: null, min: 0 },
            durationSeconds: { type: Number, default: null, min: 0 },
            band: { type: Number, default: null, min: 0, max: 9 },
            criteria: { type: WritingCriteriaSchema, default: null },
            feedback: { type: WritingFeedbackSchema, default: null },
        },
        speaking: {
            attemptId: { type: String, default: null },
            status: {
                type: String,
                enum: Object.values(EPlacementSubmoduleStatus),
                default: EPlacementSubmoduleStatus.NOT_STARTED,
            },
            part1Qs: {
                type: [
                    {
                        text: { type: String, required: true, trim: true },
                        audioKey: { type: String, default: null },
                    },
                ],
                default: [],
            },
            cueCard: {
                type: {
                    text: { type: String, required: true, trim: true },
                    audioKey: { type: String, default: null },
                    shouldSay: { type: [String], default: [] },
                },
                default: null,
            },
            part3Qs: {
                type: [
                    {
                        text: { type: String, required: true, trim: true },
                        audioKey: { type: String, default: null },
                    },
                ],
                default: [],
            },
            config: {
                type: {
                    ttsVoice: { type: String, default: null },
                    gradingModel: { type: String, default: null },
                    silenceThresholdSeconds: { type: Number, default: null, min: 0 },
                },
                default: null,
            },
            audioChunks: {
                type: [
                    {
                        part: { type: Number, enum: [1, 2, 3], required: true },
                        questionIdx: { type: Number, required: true, min: 0 },
                        byteSize: { type: Number, required: true, min: 0 },
                        mimeType: { type: String, default: null },
                        transcript: { type: String, default: null },
                        pronunciationData: { type: mongoose.Schema.Types.Mixed, default: null },
                        uploadedAt: { type: Date, required: true },
                    },
                ],
                default: [],
            },
            band: { type: Number, default: null, min: 0, max: 9 },
            criteria: { type: SpeakingCriteriaSchema, default: null },
            feedback: { type: SpeakingFeedbackSchema, default: null },
        },
        overallFeedback: { type: String, default: null },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

PlacementSessionSchema.index({ userId: 1, lrAttemptId: 1 }, { unique: true });
PlacementSessionSchema.index({ userId: 1, createdAt: -1 });

export const PlacementSession = mongoose.model<IPlacementSession>(
    'PlacementSession',
    PlacementSessionSchema,
);
