import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';
import type { IVocabulary } from './vocabulary.model.js';

export interface IReadingLesson extends mongoose.Document {
    unitId: mongoose.Types.ObjectId | IUnit;
    title: string;
    format: 'ESSAY' | 'DIALOGUE' | 'EMAIL' | 'NEWS_SNIPPET' | 'STORY';
    content: string;
    translatedContent?: string;
    imageUrl?: string;
    audioUrl?: string; // Giọng đọc mẫu (OpenAI TTS)
    targetVocabIds: (mongoose.Types.ObjectId | IVocabulary)[];
    wordCount?: number;
    estimatedReadingTime?: number;
    createdAt: Date;
    updatedAt: Date;
}

const ReadingLessonSchema = new mongoose.Schema<IReadingLesson>(
    {
        // --- 1. LIÊN KẾT ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            unique: true, // Một Unit Reading chỉ có 1 bài đọc chính
            index: true,
        },

        // --- 2. NỘI DUNG CHÍNH ---
        title: {
            type: String,
            required: true,
        },

        // Định dạng bài đọc
        format: {
            type: String,
            enum: ['ESSAY', 'DIALOGUE', 'EMAIL', 'NEWS_SNIPPET', 'STORY'],
            default: 'ESSAY',
        },

        // Nội dung HTML (chứa thẻ <mark>)
        content: {
            type: String,
            required: true,
        },

        // Bản dịch toàn bộ
        translatedContent: {
            type: String,
        },

        // --- 3. MEDIA HỖ TRỢ ---
        imageUrl: {
            type: String,
        },
        audioUrl: {
            type: String,
        },

        // --- 4. TƯƠNG TÁC TỪ VỰNG (CONTEXTUAL LINKING) ---
        targetVocabIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vocabulary'
        }],

        // --- 5. ĐỘ KHÓ & THÔNG TIN ---
        wordCount: { type: Number },
        estimatedReadingTime: { type: Number },
    },
    { timestamps: true }
);

export const ReadingLesson = mongoose.model<IReadingLesson>('ReadingLesson', ReadingLessonSchema);
