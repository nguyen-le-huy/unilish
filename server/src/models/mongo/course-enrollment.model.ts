import mongoose from 'mongoose';

export const EEnrollmentStatus = {
    ACTIVE:    'ACTIVE',
    PAUSED:    'PAUSED',
    COMPLETED: 'COMPLETED',
} as const;

export interface ICourseEnrollment extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    courseId: mongoose.Types.ObjectId;
    status: typeof EEnrollmentStatus[keyof typeof EEnrollmentStatus];
    lastLessonId: mongoose.Types.ObjectId | null;
    completedLessonCount: number;
    totalRequiredLessonCount: number;
    timeSpentSeconds: number;
    startedAt: Date;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const CourseEnrollmentSchema = new mongoose.Schema<ICourseEnrollment>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(EEnrollmentStatus),
            default: EEnrollmentStatus.ACTIVE,
            required: true,
        },
        lastLessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            default: null,
        },
        completedLessonCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalRequiredLessonCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        timeSpentSeconds: {
            type: Number,
            default: 0,
            min: 0,
        },
        startedAt: {
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

// Unique per (user, course) — prevents duplicate enrollment
CourseEnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Query active/paused/completed enrollments for a user, sorted by recency
CourseEnrollmentSchema.index({ userId: 1, status: 1, updatedAt: -1 });

// Query all enrollees of a course (admin)
CourseEnrollmentSchema.index({ courseId: 1, status: 1 });

export const CourseEnrollment = mongoose.model<ICourseEnrollment>(
    'CourseEnrollment',
    CourseEnrollmentSchema,
);
