import mongoose from 'mongoose';

// --- Enums & Types ---
export const EConceptType = {
    GRAMMAR: 'GRAMMAR',
    VOCAB: 'VOCAB',
    TOPIC: 'TOPIC',
    SKILL: 'SKILL',
    PRONUNCIATION: 'PRONUNCIATION',
} as const;

export interface IConcept extends mongoose.Document {
    // --- 1. REFERENCES ---
    languageId: mongoose.Types.ObjectId;

    // --- 2. IDENTIFICATION ---
    key: string; // 'past_simple', 'vocab_airport'
    name: string; // 'Thì quá khứ đơn'
    type: typeof EConceptType[keyof typeof EConceptType];

    // --- 3. CONTENT ---
    description?: string; // Definition for AI to understand
    metaData: any; // Grammar formulas, IPA pronunciation, etc.

    // --- 4. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const ConceptSchema = new mongoose.Schema<IConcept>(
    {
        // --- 1. REFERENCES ---
        languageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language',
            required: true,
            index: true,
        },

        // --- 2. IDENTIFICATION ---
        key: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: Object.values(EConceptType),
            required: true,
            index: true,
        },

        // --- 3. CONTENT ---
        description: {
            type: String,
            trim: true,
            default: null,
        },
        metaData: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES ---
// Unique key per language
ConceptSchema.index({ languageId: 1, key: 1 }, { unique: true });
ConceptSchema.index({ type: 1 });

export const Concept = mongoose.model<IConcept>('Concept', ConceptSchema);
