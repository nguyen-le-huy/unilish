import mongoose from 'mongoose';
import type { IModule } from './module.model.js';

export interface IUnit extends mongoose.Document {
    moduleId: mongoose.Types.ObjectId | IModule;
    title: string;
    type: 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING' | 'SPEAKING' | 'WRITING' | 'TEST';
    order: number;
    xpReward: number;
    timeToFinish?: number;
    isFree: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UnitSchema = new mongoose.Schema<IUnit>(
    {
        // --- LIÊN KẾT ---
        moduleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Module',
            required: true,
            index: true,
        },

        // --- THÔNG TIN BÀI HỌC ---
        title: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['VOCAB', 'GRAMMAR', 'READING', 'LISTENING', 'SPEAKING', 'WRITING', 'TEST'],
        },

        // --- SẮP XẾP ---
        order: {
            type: Number,
            required: true,
        },

        // --- GAME HÓA ---
        xpReward: {
            type: Number,
            default: 10,
        },
        timeToFinish: {
            type: Number,
        },

        // --- QUYỀN TRUY CẬP ---
        isFree: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Tạo Compound Index để đảm bảo trong 1 Module không có 2 bài trùng thứ tự
UnitSchema.index({ moduleId: 1, order: 1 }, { unique: true });

export const Unit = mongoose.model<IUnit>('Unit', UnitSchema);
