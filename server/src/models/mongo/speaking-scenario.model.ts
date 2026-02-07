import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';
import type { IVocabulary } from './vocabulary.model.js';

export interface ISpeakingScenario extends mongoose.Document {
    unitId: mongoose.Types.ObjectId | IUnit;
    topic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    aiPersona: {
        name: string;
        role: string;
        avatarUrl?: string;
        voiceId: string;
    };
    userPersona: {
        role: string;
        objective: string;
    };
    initialMessage: string;
    systemInstruction: string;
    sampleResponses: Array<{
        text: string;
        translation?: string;
    }>;
    requiredVocabIds: (mongoose.Types.ObjectId | IVocabulary)[];
    targetGrammar?: {
        type: string;
        description?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const SpeakingScenarioSchema = new mongoose.Schema<ISpeakingScenario>(
    {
        // --- 1. LIÊN KẾT ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            unique: true,
            index: true,
        },

        // --- 2. THÔNG TIN CHUNG ---
        topic: {
            type: String,
            required: true
        },
        difficulty: {
            type: String,
            enum: ['EASY', 'MEDIUM', 'HARD'],
            default: 'MEDIUM'
        },

        // --- 3. THIẾT LẬP VAI DIỄN (ROLEPLAY CONFIG) ---
        aiPersona: {
            name: { type: String, default: 'Officer' },
            role: { type: String, required: true },
            avatarUrl: { type: String },
            voiceId: { type: String, default: 'alloy' },
        },

        userPersona: {
            role: { type: String, required: true },
            objective: { type: String, required: true },
        },

        // --- 4. KỊCH BẢN & GỢI Ý (THE BRAIN) ---
        initialMessage: {
            type: String,
            required: true,
        },

        // System Instruction: Prompt cho OpenAI
        systemInstruction: {
            type: String,
            required: true,
        },

        // Gợi ý cho User
        sampleResponses: [
            {
                text: { type: String },
                translation: { type: String }
            }
        ],

        // --- 5. RÀNG BUỘC TỪ VỰNG (CONTEXTUAL REQUIREMENT) ---
        requiredVocabIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vocabulary'
        }],

        targetGrammar: {
            type: { type: String },
            description: { type: String }
        }
    },
    { timestamps: true }
);

export const SpeakingScenario = mongoose.model<ISpeakingScenario>('SpeakingScenario', SpeakingScenarioSchema);
