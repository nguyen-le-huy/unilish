import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';
import type { IVocabulary } from './vocabulary.model.js';

interface IOption {
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
    matchPair?: string;
}

export interface IQuestion extends mongoose.Document {
    courseLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    skill: 'VOCABULARY' | 'GRAMMAR' | 'READING' | 'LISTENING';
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'MATCHING' | 'REARRANGE';
    unitId?: mongoose.Types.ObjectId | IUnit;
    relatedVocabId?: mongoose.Types.ObjectId | IVocabulary;
    content: {
        text: string;
        audioUrl?: string;
        imageUrl?: string;
        passageText?: string;
    };
    options: IOption[];
    explanation?: string;
    point: number;
    difficulty: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Sub-schema: Cấu trúc của một phương án lựa chọn
const OptionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    imageUrl: { type: String },
    isCorrect: { type: Boolean, default: false },
    matchPair: { type: String }
}, { _id: false });

const QuestionSchema = new mongoose.Schema(
    {
        // --- 1. PHÂN LOẠI ---
        courseLevel: {
            type: String,
            required: true,
            enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            index: true,
        },
        skill: {
            type: String,
            enum: ['VOCABULARY', 'GRAMMAR', 'READING', 'LISTENING'],
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'MATCHING', 'REARRANGE'],
            required: true,
        },

        // --- 2. LIÊN KẾT BÀI HỌC (OPTIONAL) ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            index: true,
        },
        relatedVocabId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vocabulary',
        },

        // --- 3. NỘI DUNG CÂU HỎI ---
        content: {
            text: { type: String, required: true },
            audioUrl: { type: String },
            imageUrl: { type: String },
            passageText: { type: String },
        },

        // --- 4. CÁC PHƯƠNG ÁN TRẢ LỜI ---
        options: [OptionSchema],

        // --- 5. GIẢI THÍCH & ĐIỂM SỐ ---
        explanation: {
            type: String,
        },
        point: {
            type: Number,
            default: 1,
        },
        difficulty: {
            type: Number,
            min: 1, max: 5, default: 3
        },

        // Cờ kiểm soát
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Index hỗ trợ lấy câu hỏi ngẫu nhiên cho Exam
QuestionSchema.index({ courseLevel: 1, skill: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
