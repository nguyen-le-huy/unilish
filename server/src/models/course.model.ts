import mongoose from 'mongoose';

export interface ICourse extends mongoose.Document {
    code: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    title: string;
    description?: string;
    thumbnailUrl?: string;
    order: number;
    isPublished: boolean;
    totalModules: number;
    certificateTemplateId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema = new mongoose.Schema<ICourse>(
    {
        // --- ĐỊNH DANH ---
        code: {
            type: String,
            required: true,
            unique: true,
            enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
        },
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

        // --- CẤU HÌNH ---
        order: {
            type: Number,
            required: true,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },

        // --- THÔNG SỐ ĐẦU RA ---
        totalModules: { type: Number, default: 0 },
        certificateTemplateId: { type: String },
    },
    { timestamps: true }
);

export const Course = mongoose.model<ICourse>('Course', CourseSchema);
