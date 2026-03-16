import mongoose from 'mongoose';

export const EPlacementAttemptStatus = {
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
} as const;

export interface IAttemptOption {
    id: 'A' | 'B' | 'C' | 'D';
    text: string;
}

export interface IAttemptQuestionSnapshot {
    questionId: string;
    questionNumber: number;
    part: number;
    skill: 'listening' | 'reading';
    questionText: string;
    options: IAttemptOption[];
    correctOption: 'A' | 'B' | 'C' | 'D';
    groupId?: string;
    imageUrl?: string;
    imageUrls?: string[];
    audioUrl?: string;
}

export interface IAttemptPartSnapshot {
    part: number;
    name: string;
    skill: 'listening' | 'reading';
    audioUrl?: string;
    questions: IAttemptQuestionSnapshot[];
}

export interface IAttemptModuleSnapshot {
    order: number;
    type: 'mcq';
    name: string;
    timeLimitMinutes: number;
    parts: IAttemptPartSnapshot[];
}

export interface IAttemptAnswerItem {
    questionId: string;
    selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
    flagged: boolean;
    answeredAt?: Date | null;
}

export interface IPlacementTestAttempt extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    placementTestId: mongoose.Types.ObjectId;
    language: string;
    status: typeof EPlacementAttemptStatus[keyof typeof EPlacementAttemptStatus];
    startedAt: Date;
    expiresAt: Date;
    submittedAt?: Date | null;
    durationSeconds?: number | null;
    totalQuestions: number;
    runtimeSnapshot: {
        modules: IAttemptModuleSnapshot[];
    };
    answerSheet: IAttemptAnswerItem[];
    scoring?: {
        listeningCorrect: number;
        listeningTotal: number;
        readingCorrect: number;
        readingTotal: number;
        mcqScoreNormalized: number;
        provisionalCefr: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

const AttemptOptionSchema = new mongoose.Schema<IAttemptOption>(
    {
        id: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
        text: { type: String, required: true, trim: true },
    },
    { _id: false },
);

const AttemptQuestionSnapshotSchema = new mongoose.Schema<IAttemptQuestionSnapshot>(
    {
        questionId: { type: String, required: true, trim: true },
        questionNumber: { type: Number, required: true, min: 1 },
        part: { type: Number, required: true, min: 1, max: 7 },
        skill: { type: String, enum: ['listening', 'reading'], required: true },
        questionText: { type: String, required: true, trim: true },
        options: { type: [AttemptOptionSchema], default: [] },
        correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
        groupId: { type: String, default: null },
        imageUrl: { type: String, default: null },
        imageUrls: { type: [String], default: [] },
        audioUrl: { type: String, default: null },
    },
    { _id: false },
);

const AttemptPartSnapshotSchema = new mongoose.Schema<IAttemptPartSnapshot>(
    {
        part: { type: Number, required: true, min: 1, max: 7 },
        name: { type: String, required: true, trim: true },
        skill: { type: String, enum: ['listening', 'reading'], required: true },
        audioUrl: { type: String, default: null },
        questions: { type: [AttemptQuestionSnapshotSchema], default: [] },
    },
    { _id: false },
);

const AttemptModuleSnapshotSchema = new mongoose.Schema<IAttemptModuleSnapshot>(
    {
        order: { type: Number, required: true, min: 1 },
        type: { type: String, enum: ['mcq'], required: true },
        name: { type: String, required: true, trim: true },
        timeLimitMinutes: { type: Number, required: true, min: 1 },
        parts: { type: [AttemptPartSnapshotSchema], default: [] },
    },
    { _id: false },
);

const AttemptAnswerItemSchema = new mongoose.Schema<IAttemptAnswerItem>(
    {
        questionId: { type: String, required: true, trim: true },
        selectedOption: { type: String, enum: ['A', 'B', 'C', 'D'], default: null },
        flagged: { type: Boolean, default: false },
        answeredAt: { type: Date, default: null },
    },
    { _id: false },
);

const PlacementTestAttemptSchema = new mongoose.Schema<IPlacementTestAttempt>(
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
        language: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(EPlacementAttemptStatus),
            default: EPlacementAttemptStatus.IN_PROGRESS,
            index: true,
        },
        startedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        submittedAt: { type: Date, default: null },
        durationSeconds: { type: Number, default: null, min: 0 },
        totalQuestions: { type: Number, required: true, min: 1 },
        runtimeSnapshot: {
            modules: { type: [AttemptModuleSnapshotSchema], default: [] },
        },
        answerSheet: { type: [AttemptAnswerItemSchema], default: [] },
        scoring: {
            listeningCorrect: { type: Number, default: 0, min: 0 },
            listeningTotal: { type: Number, default: 0, min: 0 },
            readingCorrect: { type: Number, default: 0, min: 0 },
            readingTotal: { type: Number, default: 0, min: 0 },
            mcqScoreNormalized: { type: Number, default: 0, min: 0, max: 1 },
            provisionalCefr: { type: String, default: 'A1' },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

PlacementTestAttemptSchema.index({ userId: 1, status: 1, createdAt: -1 });
PlacementTestAttemptSchema.index({ placementTestId: 1, status: 1 });
PlacementTestAttemptSchema.index({ userId: 1, placementTestId: 1, status: 1 });

export const PlacementTestAttempt = mongoose.model<IPlacementTestAttempt>(
    'PlacementTestAttempt',
    PlacementTestAttemptSchema,
);
