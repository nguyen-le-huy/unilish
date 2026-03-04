import mongoose from 'mongoose';

// --- Enums & Types ---
export const EQuestionType = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    FILL_IN_BLANK: 'FILL_IN_BLANK',
    ERROR_CORRECTION: 'ERROR_CORRECTION',
    TRUE_FALSE: 'TRUE_FALSE',
    MATCHING: 'MATCHING',
    PRONUNCIATION: 'PRONUNCIATION',
    ESSAY: 'ESSAY',
} as const;

export const EQuestionSource = {
    PLACEMENT_TEST: 'placement_test',
    COURSE: 'course',
    PRACTICE: 'practice',
} as const;

export const EQuestionSkill = {
    LISTENING: 'listening',
    READING: 'reading',
    WRITING: 'writing',
    SPEAKING: 'speaking',
    GRAMMAR: 'grammar',
    VOCABULARY: 'vocabulary',
} as const;

export const EQuestionDifficulty = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

export const EQuestionStatus = {
    DRAFT: 'draft',
    IN_REVIEW: 'in_review',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
} as const;

export interface IQuestion extends mongoose.Document {
    // --- 1. REFERENCES ---
    languageId: mongoose.Types.ObjectId;
    testedConcept: mongoose.Types.ObjectId;

    // --- 2. CMS CLASSIFICATION ---
    source: typeof EQuestionSource[keyof typeof EQuestionSource];
    skill: typeof EQuestionSkill[keyof typeof EQuestionSkill];
    part?: number;
    difficulty: typeof EQuestionDifficulty[keyof typeof EQuestionDifficulty];
    status: typeof EQuestionStatus[keyof typeof EQuestionStatus];
    version: number;

    // --- 3. DIFFICULTY (Legacy 1-5 numeric) ---
    difficultyLevel: number;

    // --- 4. QUESTION TYPE ---
    type: typeof EQuestionType[keyof typeof EQuestionType];

    // --- 5. QUESTION STEM ---
    stem: {
        text?: string;
        audioUrl?: string;
        imageUrl?: string;
    };

    // --- 6. ANSWER CONTENT (Polymorphic) ---
    // MC: { options: [{id, text, isCorrect}] }
    // FILL: { correctAnswers: ['went', 'did go'] }
    // ESSAY: { rubric: '...' }
    content: unknown;

    // --- 7. FEEDBACK ---
    explanation?: string;

    // --- 8. TAGS ---
    tags: string[];

    // --- 9. AUDIT ---
    createdBy?: mongoose.Types.ObjectId;
    reviewedBy?: mongoose.Types.ObjectId;

    // --- 10. ANALYTICS ---
    usageCount: number;
    avgCorrectRate?: number;

    // --- 11. TIMESTAMPS ---
    createdAt: Date;
    updatedAt: Date;
}

const QuestionSchema = new mongoose.Schema<IQuestion>(
    {
        // --- 1. REFERENCES ---
        languageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
            required: true,
            index: true,
        },
        testedConcept: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Concept',
            required: true,
            index: true,
        },

        // --- 2. CMS CLASSIFICATION ---
        source: {
            type: String,
            enum: Object.values(EQuestionSource),
            required: true,
            default: EQuestionSource.COURSE,
            index: true,
        },
        skill: {
            type: String,
            enum: Object.values(EQuestionSkill),
            required: true,
            index: true,
        },
        part: {
            type: Number,
            min: 1,
            max: 7,
            default: null,
        },
        difficulty: {
            type: String,
            enum: Object.values(EQuestionDifficulty),
            required: true,
            default: EQuestionDifficulty.B1,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(EQuestionStatus),
            required: true,
            default: EQuestionStatus.DRAFT,
            index: true,
        },
        version: {
            type: Number,
            default: 1,
            min: 1,
        },

        // --- 3. DIFFICULTY (Legacy 1-5 numeric) ---
        difficultyLevel: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            default: 1,
            index: true,
        },

        // --- 4. QUESTION TYPE ---
        type: {
            type: String,
            enum: Object.values(EQuestionType),
            required: true,
            index: true,
        },

        // --- 5. QUESTION STEM ---
        stem: {
            text: {
                type: String,
                trim: true,
                default: null,
            },
            audioUrl: {
                type: String,
                default: null,
            },
            imageUrl: {
                type: String,
                default: null,
            },
        },

        // --- 6. ANSWER CONTENT (Polymorphic) ---
        content: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        // --- 7. FEEDBACK ---
        explanation: {
            type: String,
            trim: true,
            default: null,
        },

        // --- 8. TAGS ---
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true,
            },
        ],

        // --- 9. AUDIT ---
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // --- 10. ANALYTICS ---
        usageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        avgCorrectRate: {
            type: Number,
            default: null,
            min: 0,
            max: 100,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES ---
QuestionSchema.index({ languageId: 1, testedConcept: 1 });
QuestionSchema.index({ difficultyLevel: 1, type: 1 });
QuestionSchema.index({ tags: 1 });
// CMS compound indexes
QuestionSchema.index({ source: 1, skill: 1, status: 1 });
QuestionSchema.index({ difficulty: 1, status: 1 });
QuestionSchema.index({ createdBy: 1, status: 1 });
QuestionSchema.index({ tags: 1, status: 1 });
QuestionSchema.index({ status: 1, updatedAt: -1 });

// --- STATICS ---
// Static: Find questions by concept and difficulty
QuestionSchema.statics.findByConcept = function (
    conceptId: string | mongoose.Types.ObjectId,
    difficulty?: number,
    limit: number = 10
) {
    const query: Record<string, unknown> = { testedConcept: conceptId };
    if (difficulty) query.difficultyLevel = difficulty;

    return this.find(query).limit(limit);
};

// Static: Random questions for practice
QuestionSchema.statics.findRandom = function (
    languageId: string | mongoose.Types.ObjectId,
    type?: string,
    difficulty?: number,
    limit: number = 5
) {
    const query: Record<string, unknown> = { languageId };
    if (type) query.type = type;
    if (difficulty) query.difficultyLevel = difficulty;

    return this.aggregate([
        { $match: query },
        { $sample: { size: limit } },
    ]);
};

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
