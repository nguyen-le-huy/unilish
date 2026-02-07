import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';

interface IGrammarPoint {
    title: string;
    formula: string;
    explanation: string;
    examples: Array<{
        sentence: string;
        translation: string;
        audioUrl?: string;
    }>;
}

export interface IGrammar extends mongoose.Document {
    unitId: mongoose.Types.ObjectId | IUnit;
    title: string;
    summary?: string;
    level?: string;
    points: IGrammarPoint[];
    notes: string[];
    cheatSheetUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Sub-schema: Một điểm ngữ pháp nhỏ
const GrammarPointSchema = new mongoose.Schema({
    title: { type: String, required: true },
    formula: {
        type: String,
        required: true
    },
    explanation: {
        type: String,
        required: true
    },
    examples: [
        {
            sentence: { type: String, required: true },
            translation: { type: String, required: true },
            audioUrl: { type: String }
        }
    ]
});

const GrammarSchema = new mongoose.Schema(
    {
        // --- 1. LIÊN KẾT ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            index: true,
            unique: true, // Một Unit Grammar chỉ có 1 bài lý thuyết
        },

        // --- 2. TỔNG QUAN ---
        title: {
            type: String,
            required: true,
        },
        summary: {
            type: String,
        },
        level: {
            type: String,
        },

        // --- 3. NỘI DUNG CHI TIẾT ---
        points: [GrammarPointSchema],

        // --- 4. NGOẠI LỆ / LƯU Ý ---
        notes: [
            {
                type: String
            }
        ],

        // --- 5. BẢNG TRA CỨU NHANH ---
        cheatSheetUrl: {
            type: String,
        }
    },
    { timestamps: true }
);

export const Grammar = mongoose.model<IGrammar>('Grammar', GrammarSchema);
