import mongoose from 'mongoose';

export interface ILearningGoal extends mongoose.Document {
    // --- 1. IDENTIFICATION ---
    slug: string;
    title: string;
    description?: string;
    targetAudience?: string;
    iconUrl?: string;

    // --- 2. SUPPORTED LANGUAGES ---
    supportedLanguages: mongoose.Types.ObjectId[];

    // --- 3. STATUS ---
    isActive: boolean;

    // --- 4. METADATA ---
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
        iconUrl: {
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

        // --- 3. STATUS ---
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

export const LearningGoal = mongoose.model<ILearningGoal>('LearningGoal', LearningGoalSchema);
