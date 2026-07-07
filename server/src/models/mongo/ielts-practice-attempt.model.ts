import mongoose from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const EAttemptStatus = {
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    EXPIRED: 'expired',
    ABANDONED: 'abandoned',
} as const;

export type AttemptStatus = (typeof EAttemptStatus)[keyof typeof EAttemptStatus];

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface IIeltsPracticeAttempt extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    examTestId: mongoose.Types.ObjectId;
    logicalTestId?: mongoose.Types.ObjectId;
    examVersion: number;
    skill: string;
    questionType: string;
    status: AttemptStatus;
    revision: number;
    /** Full server snapshot with answer keys — select: false by default */
    contentSnapshot: Record<string, unknown>;
    /** Learner's draft answers — shape varies by skill */
    draft: Record<string, unknown>;
    /** Flagged item IDs (Listening/Reading only) */
    flaggedItemIds: string[];
    startedAt: Date;
    deadlineAt: Date;
    lastSavedAt?: Date;
    submittedAt?: Date;
    /** Objective result for Listening/Reading or AI result for Writing/Speaking */
    result?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const ObjectiveResultSchema = new mongoose.Schema(
    {
        gradingType: { type: String, enum: ['objective'], required: true },
        correct: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        normalizedScore: { type: Number, required: true, min: 0, max: 1 },
        itemResults: {
            type: [
                {
                    itemId: { type: String, required: true },
                    correct: { type: Boolean, required: true },
                },
            ],
            default: [],
        },
    },
    { _id: false },
);

const IeltsPracticeAttemptSchema = new mongoose.Schema<IIeltsPracticeAttempt>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        examTestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ExamTest',
            required: true,
        },
        logicalTestId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        examVersion: { type: Number, required: true, min: 1 },
        skill: { type: String, required: true },
        questionType: { type: String, required: true },
        status: {
            type: String,
            enum: Object.values(EAttemptStatus),
            default: EAttemptStatus.IN_PROGRESS,
            index: true,
        },
        revision: { type: Number, default: 0, min: 0 },
        contentSnapshot: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            select: false,
        },
        draft: { type: mongoose.Schema.Types.Mixed, default: {} },
        flaggedItemIds: { type: [String], default: [] },
        startedAt: { type: Date, required: true },
        deadlineAt: { type: Date, required: true, index: true },
        lastSavedAt: { type: Date, default: null },
        submittedAt: { type: Date, default: null },
        result: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    {
        timestamps: true,
        collection: 'ieltspracticeattempts',
    },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

IeltsPracticeAttemptSchema.index({ userId: 1, createdAt: -1 });
IeltsPracticeAttemptSchema.index({ examTestId: 1, status: 1 });
IeltsPracticeAttemptSchema.index({ logicalTestId: 1, userId: 1, createdAt: -1 });
IeltsPracticeAttemptSchema.index({ status: 1, deadlineAt: 1 });

// Partial unique: one in_progress attempt per (user, logicalTestId)
IeltsPracticeAttemptSchema.index(
    { userId: 1, logicalTestId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: EAttemptStatus.IN_PROGRESS },
    },
);

// ─── Model ───────────────────────────────────────────────────────────────────

export const IeltsPracticeAttempt = mongoose.model<IIeltsPracticeAttempt>(
    'IeltsPracticeAttempt',
    IeltsPracticeAttemptSchema,
);
