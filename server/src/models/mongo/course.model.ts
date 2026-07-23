import mongoose from 'mongoose';

// --- Enums & Types ---
export const ECEFRLevel = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

export interface ICourse extends mongoose.Document {
    // ── 1. REFERENCES ───────────────────────────────────────────────────────
    /** @deprecated Replaced by languageId. Kept for backward-compat during migration. */
    seriesId?: mongoose.Types.ObjectId;
    languageId: mongoose.Types.ObjectId;
    learningGoalId: mongoose.Types.ObjectId;

    // ── 2. BASIC INFO ───────────────────────────────────────────────────────
    name: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    level: typeof ECEFRLevel[keyof typeof ECEFRLevel];

    /** @deprecated Replaced by orderIndex. Kept for backward-compat during migration. */
    orderInSeries?: number;
    orderIndex: number;

    // ── 3. STATISTICS ───────────────────────────────────────────────────────
    totalUnits: number;

    // ── 4. STATUS ──────────────────────────────────────────────────────────
    isActive: boolean;

    // ── 5. METADATA ─────────────────────────────────────────────────────────
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema = new mongoose.Schema<ICourse>(
    {
        // ── 1. REFERENCES ───────────────────────────────────────────────────
        /** @deprecated Replaced by languageId. Kept for backward-compat during migration. */
        seriesId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CourseSeries',
            required: false,
            default: undefined,
        },
        languageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
            required: true,
            index: true,
        },
        learningGoalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LearningGoal',
            required: true,
            index: true,
        },
        // ── 2. BASIC INFO ───────────────────────────────────────────────────
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang'],
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        thumbnailUrl: {
            type: String,
            default: null,
        },
        level: {
            type: String,
            enum: Object.values(ECEFRLevel),
            required: true,
            index: true,
        },

        /** @deprecated Replaced by orderIndex. Kept for backward-compat during migration. */
        orderInSeries: {
            type: Number,
            required: false,
            min: 1,
            default: undefined,
        },
        orderIndex: {
            type: Number,
            required: true,
            min: 1,
        },

        // ── 3. STATISTICS ───────────────────────────────────────────────────
        totalUnits: {
            type: Number,
            default: 0,
            min: 0,
        },

        // ── 4. STATUS ───────────────────────────────────────────────────────
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── INDEXES ─────────────────────────────────────────────────────────────────

// Unique slug (per plan 3.1)
CourseSchema.index({ slug: 1 }, { unique: true });

// Unique compound: one course per (language, goal, level, position)
CourseSchema.index(
    { languageId: 1, learningGoalId: 1, level: 1, orderIndex: 1 },
    { unique: true },
);

// Query: list courses for a language+goal (common admin filter)
CourseSchema.index({ languageId: 1, learningGoalId: 1, isActive: 1, orderIndex: 1 });

// Query: filter by language+level
CourseSchema.index({ languageId: 1, level: 1 });

// Keep old indexes during migration window (remove in Phase 4)
// CourseSchema.index({ seriesId: 1, orderInSeries: 1 }, { unique: true });
// CourseSchema.index({ seriesId: 1, level: 1 });

CourseSchema.index({ isActive: 1 });

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
