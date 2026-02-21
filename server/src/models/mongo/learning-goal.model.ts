import mongoose from 'mongoose';

export interface ILearningGoal extends mongoose.Document {
    // --- 1. IDENTIFICATION ---
    slug: string;
    title: string;
    description?: string;
    targetAudience?: string;

    // --- 2. SUPPORTED LANGUAGES ---
    supportedLanguages: mongoose.Types.ObjectId[];

    // --- 3. AI PERSONA ---
    systemPrompt: string;

    // --- 4. WEIGHTED SKILLS ---
    skillWeights: {
        listening: number;
        speaking: number;
        reading: number;
        writing: number;
        grammar: number;
        vocabulary: number;
    };

    // --- 5. AI CORRECTION RULES ---
    ignoredSkills: string[];

    // --- 6. STATUS ---
    isActive: boolean;

    // --- 7. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const LearningGoalSchema = new mongoose.Schema<ILearningGoal>(
    {
        // --- 1. IDENTIFICATION ---
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        targetAudience: {
            type: String,
            trim: true,
            default: null,
        },

        // --- 2. SUPPORTED LANGUAGES ---
        supportedLanguages: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Language',
                index: true,
            },
        ],

        // --- 3. AI PERSONA ---
        systemPrompt: {
            type: String,
            required: true,
        },

        // --- 4. WEIGHTED SKILLS (Total should = 1.0) ---
        skillWeights: {
            listening: { type: Number, default: 0.25, min: 0, max: 1 },
            speaking: { type: Number, default: 0.25, min: 0, max: 1 },
            reading: { type: Number, default: 0.25, min: 0, max: 1 },
            writing: { type: Number, default: 0.25, min: 0, max: 1 },
            grammar: { type: Number, default: 0.0, min: 0, max: 1 },
            vocabulary: { type: Number, default: 0.0, min: 0, max: 1 },
        },

        // --- 5. AI CORRECTION RULES ---
        ignoredSkills: [
            {
                type: String,
                trim: true,
            },
        ],

        // --- 6. STATUS ---
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
LearningGoalSchema.index({ slug: 1 }, { unique: true });
LearningGoalSchema.index({ isActive: 1 });
LearningGoalSchema.index({ supportedLanguages: 1 });

// --- VIRTUALS ---
LearningGoalSchema.virtual('totalWeight').get(function (this: ILearningGoal) {
    return (
        this.skillWeights.listening +
        this.skillWeights.speaking +
        this.skillWeights.reading +
        this.skillWeights.writing +
        this.skillWeights.grammar +
        this.skillWeights.vocabulary
    );
});

export const LearningGoal = mongoose.model<ILearningGoal>('LearningGoal', LearningGoalSchema);
