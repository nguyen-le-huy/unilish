import mongoose from 'mongoose';

export const ELessonProgressStatus = {
    NOT_STARTED:  'NOT_STARTED',
    IN_PROGRESS:  'IN_PROGRESS',
    COMPLETED:    'COMPLETED',
} as const;

export interface ILearnerLessonProgress extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    enrollmentId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    unitId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    status: typeof ELessonProgressStatus[keyof typeof ELessonProgressStatus];
    checkpointVersion: number;
    checkpoint: mongoose.Schema.Types.Mixed;
    attemptsCount: number;
    latestScore: number;
    bestScore: number;
    timeSpentSeconds: number;
    firstStartedAt: Date | null;
    lastAccessedAt: Date;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const LearnerLessonProgressSchema = new mongoose.Schema<ILearnerLessonProgress>(
    {
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
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
        },
        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(ELessonProgressStatus),
            default: ELessonProgressStatus.NOT_STARTED,
            required: true,
        },
        checkpointVersion: {
            type: Number,
            default: 0,
            min: 0,
        },
        checkpoint: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        attemptsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        latestScore: {
            type: Number,
            default: -1, // -1 = no score yet
            min: -1,
        },
        bestScore: {
            type: Number,
            default: -1,
            min: -1,
        },
        timeSpentSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        firstStartedAt: {
            type: Date,
            default: null,
        },
        lastAccessedAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

// ── INDEXES ─────────────────────────────────────────────────────────────────

// One progress record per (user, lesson)
LearnerLessonProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

// Query progress records by enrollment
LearnerLessonProgressSchema.index({ enrollmentId: 1, status: 1 });

// Recent lesson access (for resume/restore)
LearnerLessonProgressSchema.index({ userId: 1, lastAccessedAt: -1 });

export const LearnerLessonProgress = mongoose.model<ILearnerLessonProgress>(
    'LearnerLessonProgress',
    LearnerLessonProgressSchema,
);
