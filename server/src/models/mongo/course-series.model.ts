import mongoose from 'mongoose';

export interface ICourseSeries extends mongoose.Document {
    // --- 1. REFERENCES ---
    languageId: mongoose.Types.ObjectId;
    learningGoalId: mongoose.Types.ObjectId;

    // --- 2. BASIC INFO ---
    title: string; // 'Lộ trình Du lịch Toàn diện'
    slug: string;
    description?: string;
    thumbnailUrl?: string;

    // --- 3. STATISTICS ---
    totalCourses: number; // Number of courses (A1-C2)

    // --- 4. STATUS ---
    isActive: boolean;

    // --- 5. OPTIONAL AI CACHE ---
    aiCache?: {
        analysis: {
            summary: string;
            topics: string[];
            audience: 'beginner' | 'intermediate' | 'advanced' | 'all';
            skills: Array<'nghe' | 'nói' | 'đọc' | 'viết'>;
            tags: string[];
            levelMin: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
            levelMax: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
            useCase: string;
        };
        analyzedAt: Date;
        contentHash: string;
    } | null;

    // --- 5. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const CourseSeriesSchema = new mongoose.Schema<ICourseSeries>(
    {
        // --- 1. REFERENCES ---
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

        // --- 2. BASIC INFO ---
        title: {
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
            index: true,
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

        // --- 3. STATISTICS ---
        totalCourses: {
            type: Number,
            default: 0,
            min: 0,
        },

        // --- 4. STATUS ---
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        aiCache: {
            type: new mongoose.Schema(
                {
                    analysis: {
                        summary: { type: String, trim: true },
                        topics: [{ type: String, trim: true }],
                        audience: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all'] },
                        skills: [{ type: String, enum: ['nghe', 'nói', 'đọc', 'viết'] }],
                        tags: [{ type: String, trim: true }],
                        levelMin: { type: String, enum: ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
                        levelMax: { type: String, enum: ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
                        useCase: { type: String, trim: true },
                    },
                    analyzedAt: { type: Date },
                    contentHash: { type: String, trim: true },
                },
                { _id: false },
            ),
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES ---
CourseSeriesSchema.index({ slug: 1 }, { unique: true });
CourseSeriesSchema.index({ languageId: 1, learningGoalId: 1 });
CourseSeriesSchema.index({ isActive: 1 });

export const CourseSeries = mongoose.model<ICourseSeries>('CourseSeries', CourseSeriesSchema);
