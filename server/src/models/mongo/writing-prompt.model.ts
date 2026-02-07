import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';
import type { IVocabulary } from './vocabulary.model.js';

interface IWritingTask {
    type: 'ESSAY' | 'EMAIL' | 'SENTENCE_BUILDING' | 'REWRITE';
    question: string;
    context?: string;
    minWords: number;
    maxWords: number;
    requiredVocabIds: (mongoose.Types.ObjectId | IVocabulary)[];
    aiGradingPrompt: string;
    modelAnswer?: string;
    metadata?: Record<string, any>;
}

export interface IWritingPrompt extends mongoose.Document {
    unitId: mongoose.Types.ObjectId | IUnit;
    title: string;
    description?: string;
    tasks: IWritingTask[];
    createdAt: Date;
    updatedAt: Date;
}

// Sub-schema: Cấu trúc của 1 nhiệm vụ viết cụ thể
const WritingTaskSchema = new mongoose.Schema({
    // Loại bài tập
    type: {
        type: String,
        enum: ['ESSAY', 'EMAIL', 'SENTENCE_BUILDING', 'REWRITE'],
        required: true
    },

    // Đề bài chi tiết
    question: {
        type: String,
        required: true
    },

    // Bối cảnh (giúp user dễ nhập vai)
    context: {
        type: String
    },

    // --- RÀNG BUỘC (CONSTRAINTS) ---
    minWords: { type: Number, default: 0 },
    maxWords: { type: Number, default: 500 },

    // Yêu cầu bắt buộc dùng từ vựng nào (Contextual Learning)
    requiredVocabIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vocabulary'
    }],

    // --- HỖ TRỢ CHẤM ĐIỂM (AI CONFIG) ---
    aiGradingPrompt: {
        type: String,
        default: 'Grade based on grammar, vocabulary relevance, and coherence.'
    },

    // Bài mẫu (Model Answer)
    modelAnswer: {
        type: String,
    },

    // Dữ liệu bổ trợ cho dạng bài Sentence Building
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
});

const WritingPromptSchema = new mongoose.Schema(
    {
        // --- 1. LIÊN KẾT ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            unique: true, // 1 Unit Writing có 1 bộ đề
            index: true,
        },

        // --- 2. THÔNG TIN CHUNG ---
        title: { type: String, required: true },
        description: { type: String },

        // --- 3. DANH SÁCH NHIỆM VỤ ---
        tasks: [WritingTaskSchema],
    },
    { timestamps: true }
);

export const WritingPrompt = mongoose.model<IWritingPrompt>('WritingPrompt', WritingPromptSchema);
