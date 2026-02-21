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
    // --- 1. REFERENCES ---
    seriesId: mongoose.Types.ObjectId;
    prerequisiteCourseId?: mongoose.Types.ObjectId;

    // --- 2. BASIC INFO ---
    name: string; // 'Travel English: Beginner A1'
    level: typeof ECEFRLevel[keyof typeof ECEFRLevel];
    orderInSeries: number; // 1, 2, 3...

    // --- 3. STATISTICS ---
    totalUnits: number;

    // --- 4. FINAL EXAM CONFIGURATION ---
    finalExamConfig: {
        durationMinutes: number;
        passScore: number; // 0-100
        structureMatrix: {
            vocabCount?: number;
            grammarCount?: number;
            readingTaskCount?: number;
            listeningTaskCount?: number;
            writingTaskCount?: number;
            speakingTaskCount?: number;
        };
        questionPool: {
            readingLessonIds: mongoose.Types.ObjectId[];
            listeningLessonIds: mongoose.Types.ObjectId[];
        };
    };

    // --- 5. STATUS ---
    isActive: boolean;

    // --- 6. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema = new mongoose.Schema<ICourse>(
    {
        // --- 1. REFERENCES ---
        seriesId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CourseSeries',
            required: true,
            index: true,
        },
        prerequisiteCourseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            default: null,
        },

        // --- 2. BASIC INFO ---
        name: {
            type: String,
            required: true,
            trim: true,
        },
        level: {
            type: String,
            enum: Object.values(ECEFRLevel),
            required: true,
            index: true,
        },
        orderInSeries: {
            type: Number,
            required: true,
            min: 1,
        },

        // --- 3. STATISTICS ---
        totalUnits: {
            type: Number,
            default: 0,
            min: 0,
        },

        // --- 4. FINAL EXAM CONFIGURATION ---
        finalExamConfig: {
            durationMinutes: {
                type: Number,
                default: 60,
                min: 1,
            },
            passScore: {
                type: Number,
                default: 65,
                min: 0,
                max: 100,
            },
            structureMatrix: {
                vocabCount: { type: Number, default: 0 },
                grammarCount: { type: Number, default: 0 },
                readingTaskCount: { type: Number, default: 0 },
                listeningTaskCount: { type: Number, default: 0 },
                writingTaskCount: { type: Number, default: 0 },
                speakingTaskCount: { type: Number, default: 0 },
            },
            questionPool: {
                readingLessonIds: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson',
                    },
                ],
                listeningLessonIds: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'Lesson',
                    },
                ],
            },
        },

        // --- 5. STATUS ---
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

// --- INDEXES ---
CourseSchema.index({ seriesId: 1, orderInSeries: 1 });
CourseSchema.index({ seriesId: 1, level: 1 }, { unique: true });
CourseSchema.index({ isActive: 1 });

// --- VIRTUALS ---
// Virtual: Total exam questions
CourseSchema.virtual('totalExamQuestions').get(function (this: ICourse) {
    const matrix = this.finalExamConfig.structureMatrix;
    return (
        (matrix.vocabCount || 0) +
        (matrix.grammarCount || 0) +
        (matrix.readingTaskCount || 0) +
        (matrix.listeningTaskCount || 0) +
        (matrix.writingTaskCount || 0) +
        (matrix.speakingTaskCount || 0)
    );
});

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
