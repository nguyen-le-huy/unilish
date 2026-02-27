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

export interface IQuestion extends mongoose.Document {
    // --- 1. REFERENCES ---
    languageId: mongoose.Types.ObjectId;
    testedConcept: mongoose.Types.ObjectId; // Concept being tested

    // --- 2. DIFFICULTY ---
    difficultyLevel: number; // 1-5

    // --- 3. QUESTION TYPE ---
    type: typeof EQuestionType[keyof typeof EQuestionType];

    // --- 4. QUESTION STEM ---
    stem: {
        text?: string;
        audioUrl?: string;
        imageUrl?: string;
    };

    // --- 5. ANSWER CONTENT (Polymorphic) ---
    // MC: { options: [{id, text, isCorrect}] }
    // FILL: { correctAnswers: ['went', 'did go'] }
    // ESSAY: { rubric: '...' }
    content: any;

    // --- 6. FEEDBACK ---
    explanation?: string; // AI uses this for detailed feedback

    // --- 7. TAGS ---
    tags: string[]; // ['business', 'formal', 'ielts']

    // --- 8. METADATA ---
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

        // --- 2. DIFFICULTY ---
        difficultyLevel: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            default: 1,
            index: true,
        },

        // --- 3. QUESTION TYPE ---
        type: {
            type: String,
            enum: Object.values(EQuestionType),
            required: true,
            index: true,
        },

        // --- 4. QUESTION STEM ---
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

        // --- 5. ANSWER CONTENT (Polymorphic) ---
        content: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },

        // --- 6. FEEDBACK ---
        explanation: {
            type: String,
            trim: true,
            default: null,
        },

        // --- 7. TAGS ---
        tags: [
            {
                type: String,
                trim: true,
                lowercase: true,
            },
        ],
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

// --- STATICS ---
// Static: Find questions by concept and difficulty
QuestionSchema.statics.findByConcept = function (
    conceptId: string | mongoose.Types.ObjectId,
    difficulty?: number,
    limit: number = 10
) {
    const query: any = { testedConcept: conceptId };
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
    const query: any = { languageId };
    if (type) query.type = type;
    if (difficulty) query.difficultyLevel = difficulty;

    return this.aggregate([
        { $match: query },
        { $sample: { size: limit } },
    ]);
};

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
