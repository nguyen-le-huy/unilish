import mongoose from 'mongoose';

// --- Enums & Types ---
export const ELessonType = {
    VOCAB: 'VOCAB',
    GRAMMAR: 'GRAMMAR',
    READING: 'READING',
    LISTENING: 'LISTENING',
    SPEAKING: 'SPEAKING',
    WRITING: 'WRITING',
    UNIT_TEST: 'UNIT_TEST',
} as const;

export const EPracticeMode = {
    FIXED: 'FIXED', // Pre-defined questions
    DYNAMIC: 'DYNAMIC', // AI-generated questions
} as const;

export interface ILesson extends mongoose.Document {
    // --- 1. REFERENCES ---
    unitId: mongoose.Types.ObjectId;
    taughtConcepts: mongoose.Types.ObjectId[]; // Concepts taught in this lesson

    // --- 2. BASIC INFO ---
    title: string;
    orderIndex: number;
    type: typeof ELessonType[keyof typeof ELessonType];

    // --- 3. POLYMORPHIC CONTENT ---
    // Type = VOCAB: [{ word: 'apple', meaning: 'táo', audio: 'url' }]
    // Type = READING: { text: '...', translation: '...' }
    // Type = GRAMMAR: { rule: '...', examples: [...] }
    content: any; // Schema.Types.Mixed

    // --- 4. PRACTICE CONFIGURATION ---
    practiceConfig: {
        mode: typeof EPracticeMode[keyof typeof EPracticeMode];
        questionIds: mongoose.Types.ObjectId[]; // For FIXED mode
        dynamicRules: {
            quantity: number; // Number of questions to generate
            difficulty: number; // 1-5
        };
        passingScore: number; // 0-100
    };

    // --- 5. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const LessonSchema = new mongoose.Schema<ILesson>(
    {
        // --- 1. REFERENCES ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            index: true,
        },
        taughtConcepts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Concept',
            },
        ],

        // --- 2. BASIC INFO ---
        title: {
            type: String,
            required: true,
            trim: true,
        },
        orderIndex: {
            type: Number,
            required: true,
            min: 1,
        },
        type: {
            type: String,
            enum: Object.values(ELessonType),
            required: true,
            index: true,
        },

        // --- 3. POLYMORPHIC CONTENT ---
        content: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        // --- 4. PRACTICE CONFIGURATION ---
        practiceConfig: {
            mode: {
                type: String,
                enum: Object.values(EPracticeMode),
                default: EPracticeMode.FIXED,
            },
            questionIds: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Question',
                },
            ],
            dynamicRules: {
                quantity: {
                    type: Number,
                    default: 5,
                    min: 1,
                },
                difficulty: {
                    type: Number,
                    default: 1,
                    min: 1,
                    max: 5,
                },
            },
            passingScore: {
                type: Number,
                default: 80,
                min: 0,
                max: 100,
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES ---
LessonSchema.index({ unitId: 1, orderIndex: 1 });
LessonSchema.index({ type: 1 });
LessonSchema.index({ taughtConcepts: 1 }); // For knowledge graph queries

// --- VIRTUALS ---
// Virtual: Is this lesson a test?
LessonSchema.virtual('isTest').get(function (this: ILesson) {
    return this.type === ELessonType.UNIT_TEST;
});

// Virtual: Has fixed questions?
LessonSchema.virtual('hasFixedQuestions').get(function (this: ILesson) {
    return this.practiceConfig.mode === EPracticeMode.FIXED && this.practiceConfig.questionIds.length > 0;
});

export const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);
