import mongoose from 'mongoose';
import type { IUser } from './user.model.js';
import type { IVocabulary } from './vocabulary.model.js';

export interface IVocabularyProgress extends mongoose.Document {
    userId: mongoose.Types.ObjectId | IUser;
    vocabId: mongoose.Types.ObjectId | IVocabulary;
    status: 'new' | 'learning' | 'review' | 'mastered';
    nextReviewDate: Date;
    streak: number;
    easeFactor: number;
    createdAt: Date;
    updatedAt: Date;
}

const VocabularyProgressSchema = new mongoose.Schema<IVocabularyProgress>(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        vocabId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary', required: true },

        // --- SPACED REPETITION SYSTEM (SRS) ---
        status: {
            type: String,
            enum: ['new', 'learning', 'review', 'mastered'],
            default: 'new',
        },
        nextReviewDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        streak: {
            type: Number,
            default: 0,
        },
        easeFactor: {
            type: Number,
            default: 2.5,
        }
    },
    { timestamps: true }
);

// Mỗi user chỉ có 1 record progress cho 1 từ
VocabularyProgressSchema.index({ userId: 1, vocabId: 1 }, { unique: true });

export const VocabularyProgress = mongoose.model<IVocabularyProgress>('VocabularyProgress', VocabularyProgressSchema);
