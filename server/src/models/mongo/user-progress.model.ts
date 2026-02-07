import mongoose from 'mongoose';
import type { IUser } from './user.model.js';
import type { IUnit } from './unit.model.js';
import type { IModule } from './module.model.js';
import type { ICourse } from './course.model.js';

export interface IUserProgress extends mongoose.Document {
    userId: mongoose.Types.ObjectId | IUser;
    unitId: mongoose.Types.ObjectId | IUnit;
    moduleId?: mongoose.Types.ObjectId | IModule;
    courseId?: string; // Storing Course Code (e.g. "A1") directly or ID
    status: 'IN_PROGRESS' | 'COMPLETED';
    lastPosition?: any;
    score: number;
    isPassed: boolean;
    detailScore?: {
        pronunciation?: number;
        fluency?: number;
        grammar?: number;
        vocab?: number;
        content?: number;
    };
    userAnswers?: Array<{
        questionId: mongoose.Types.ObjectId;
        selectedOptionId: string;
        isCorrect: boolean;
    }>;
    artifactUrl?: string; // Link to recording or essay
    attempts: number;
    timeSpent: number;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserProgressSchema = new mongoose.Schema<IUserProgress>(
    {
        // --- 1. ĐỊNH DANH (WHO & WHAT) ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
        },
        // Denormalization
        moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
        courseId: { type: String, ref: 'Course' },

        // --- 2. TRẠNG THÁI (STATUS) ---
        status: {
            type: String,
            enum: ['IN_PROGRESS', 'COMPLETED'],
            default: 'IN_PROGRESS',
        },
        lastPosition: {
            type: mongoose.Schema.Types.Mixed,
            default: 0,
        },

        // --- 3. KẾT QUẢ (PERFORMANCE) ---
        score: {
            type: Number,
            default: 0,
        },
        isPassed: {
            type: Boolean,
            default: false,
        },

        // Lưu chi tiết điểm thành phần
        detailScore: {
            pronunciation: Number,
            fluency: Number,
            grammar: Number,
            vocab: Number,
            content: Number
        },

        // --- 4. SIÊU DỮ LIỆU (META DATA) ---
        userAnswers: [
            {
                questionId: { type: mongoose.Schema.Types.ObjectId },
                selectedOptionId: String,
                isCorrect: Boolean,
            }
        ],
        artifactUrl: { type: String },

        // --- 5. THỐNG KÊ ---
        attempts: { type: Number, default: 1 },
        timeSpent: { type: Number, default: 0 },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

// Mỗi User chỉ có 1 bản ghi tiến độ cho 1 Unit
UserProgressSchema.index({ userId: 1, unitId: 1 }, { unique: true });

export const UserProgress = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
