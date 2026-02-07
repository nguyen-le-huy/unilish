import mongoose from 'mongoose';
import type { ICourse } from './course.model.js';

export interface IModule extends mongoose.Document {
    courseId: mongoose.Types.ObjectId | ICourse;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    order: number;
    finalQuizId?: mongoose.Types.ObjectId;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ModuleSchema = new mongoose.Schema<IModule>(
    {
        // --- LIÊN KẾT ---
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true,
        },

        // --- NỘI DUNG ---
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        thumbnailUrl: {
            type: String,
        },

        // --- SẮP XẾP ---
        order: {
            type: Number,
            required: true,
        },

        // --- CẤU HÌNH KIỂM TRA ---
        finalQuizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question', // Ref to Question model (to be created)
            default: null
        },

        isPublished: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Module = mongoose.model<IModule>('Module', ModuleSchema);
