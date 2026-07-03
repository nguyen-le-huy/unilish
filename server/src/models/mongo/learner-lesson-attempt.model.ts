import mongoose from 'mongoose';

export interface ILearnerLessonAttempt extends mongoose.Document {
    clientAttemptId: string;
    userId: mongoose.Types.ObjectId;
    enrollmentId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    submissionKind: string; // 'OBJECTIVE' | 'SPEAKING' | 'WRITING' | 'COMPLETION'
    submittedAnswers: mongoose.Schema.Types.Mixed;
    score: number;
    passed: boolean;
    feedback: mongoose.Schema.Types.Mixed;
    durationSeconds: number;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LearnerLessonAttemptSchema = new mongoose.Schema<ILearnerLessonAttempt>(
    {
        clientAttemptId: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        enrollmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CourseEnrollment',
            required: true,
        },
        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true,
        },
        submissionKind: {
            type: String,
            required: true,
            enum: ['OBJECTIVE', 'SPEAKING', 'WRITING', 'COMPLETION'],
        },
        submittedAnswers: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
        passed: {
            type: Boolean,
            default: false,
        },
        feedback: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        durationSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

// ── INDEXES ─────────────────────────────────────────────────────────────────

// Idempotency key: one attempt per (user, clientAttemptId)
LearnerLessonAttemptSchema.index({ userId: 1, clientAttemptId: 1 }, { unique: true });

// Query attempts for a lesson sorted by submission time
LearnerLessonAttemptSchema.index({ userId: 1, lessonId: 1, submittedAt: -1 });

export const LearnerLessonAttempt = mongoose.model<ILearnerLessonAttempt>(
    'LearnerLessonAttempt',
    LearnerLessonAttemptSchema,
);
