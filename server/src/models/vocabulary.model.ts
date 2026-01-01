import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';

export interface IVocabulary extends mongoose.Document {
    unitId: mongoose.Types.ObjectId | IUnit;
    word: string;
    ipa?: string;
    pos: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'phrase' | 'idiom';
    audioUrl: string;
    imageUrl?: string;
    meaning: string;
    definition?: string;
    example: {
        sentence: string;
        translation: string;
        audioUrl?: string;
    };
    level: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const VocabularySchema = new mongoose.Schema<IVocabulary>(
    {
        // --- 1. LIÊN KẾT (RELATIONSHIP) ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            index: true,
        },

        // --- 2. THÔNG TIN CỐT LÕI (FLASHCARD FRONT) ---
        word: {
            type: String,
            required: true,
            trim: true,
        },
        ipa: {
            type: String,
        },
        pos: {
            type: String,
            enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'phrase', 'idiom'],
            required: true,
        },
        audioUrl: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
        },

        // --- 3. ĐỊNH NGHĨA & NGỮ CẢNH (FLASHCARD BACK) ---
        meaning: {
            type: String,
            required: true,
        },
        definition: {
            type: String,
        },
        example: {
            sentence: { type: String, required: true },
            translation: { type: String, required: true },
            audioUrl: { type: String }
        },

        // --- 4. META DATA ---
        level: {
            type: String,
            index: true,
        },
        tags: [{ type: String }],
    },
    { timestamps: true }
);

// Đảm bảo trong 1 bài học không có 2 từ trùng nhau
VocabularySchema.index({ unitId: 1, word: 1 }, { unique: true });

export const Vocabulary = mongoose.model<IVocabulary>('Vocabulary', VocabularySchema);
