import mongoose from 'mongoose';

export interface IUnit extends mongoose.Document {
    // --- 1. REFERENCES ---
    courseId: mongoose.Types.ObjectId;

    // --- 2. BASIC INFO ---
    title: string; // 'Unit 1: At the Airport'
    orderIndex: number;
    description?: string;
    thumbnailUrl?: string;

    // --- 3. AI CONTEXT SEED ---
    contextSeed: {
        scenario?: string; // 'Late check-in with overweight luggage'
        keywords: string[]; // ['luggage', 'overweight', 'boarding pass']
        culturalNotes?: string; // 'Tipping culture notes...'
    };

    // --- 4. RAG (Retrieval Augmented Generation) ---
    vectorId?: string; // Reference to Pinecone vector DB

    // --- 5. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const UnitSchema = new mongoose.Schema<IUnit>(
    {
        // --- 1. REFERENCES ---
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true,
        },

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
        description: {
            type: String,
            trim: true,
            default: null,
        },
        thumbnailUrl: {
            type: String,
            default: null,
        },

        // --- 3. AI CONTEXT SEED ---
        contextSeed: {
            scenario: {
                type: String,
                trim: true,
                default: null,
            },
            keywords: [
                {
                    type: String,
                    trim: true,
                },
            ],
            culturalNotes: {
                type: String,
                trim: true,
                default: null,
            },
        },

        // --- 4. RAG (Retrieval Augmented Generation) ---
        vectorId: {
            type: String,
            default: null,
            index: true, // For quick lookup in Pinecone
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES ---
UnitSchema.index({ courseId: 1, orderIndex: 1 }, { unique: true });
UnitSchema.index({ vectorId: 1 });

export const Unit = mongoose.model<IUnit>('Unit', UnitSchema);
