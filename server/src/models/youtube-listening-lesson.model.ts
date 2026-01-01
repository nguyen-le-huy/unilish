import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';
import type { IUser } from './user.model.js';

interface IGap {
    word: string;
    index: number;
    hint?: string;
    type?: 'noun' | 'verb' | 'adj' | 'adv';
}

interface IVideoSegment {
    startTime: number;
    endTime: number;
    fullText: string;
    displayText: string;
    gaps: IGap[];
}

export interface IYoutubeListeningLesson extends mongoose.Document {
    title: string;
    originalTitle?: string;
    youtubeLink: string;
    videoId: string;
    thumbnailUrl?: string;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    topic?: 'Daily Life' | 'Technology' | 'Business' | 'Entertainment' | 'News';
    tags: string[];
    unitId?: mongoose.Types.ObjectId | IUnit;
    segments: IVideoSegment[];
    totalGaps: number;
    views: number;
    isPublished: boolean;
    createdBy?: mongoose.Types.ObjectId | IUser;
    createdAt: Date;
    updatedAt: Date;
}

// --- SUB-SCHEMA: CẤU TRÚC 1 TỪ CẦN ĐIỀN (GAP) ---
const GapSchema = new mongoose.Schema({
    word: { type: String, required: true },
    index: { type: Number, required: true },
    hint: { type: String },
    type: { type: String, enum: ['noun', 'verb', 'adj', 'adv'] }
}, { _id: false });

// --- SUB-SCHEMA: 1 ĐOẠN VIDEO (SEGMENT) ---
const VideoSegmentSchema = new mongoose.Schema({
    startTime: { type: Number, required: true },
    endTime: { type: Number, required: true },

    // Text đầy đủ
    fullText: { type: String, required: true },

    // Text hiển thị cho User 
    displayText: { type: String, required: true },

    // Danh sách các từ cần điền
    gaps: [GapSchema]
}, { _id: false });

// --- MAIN SCHEMA ---
const YoutubeListeningLessonSchema = new mongoose.Schema(
    {
        // --- 1. THÔNG TIN VIDEO ---
        title: { type: String, required: true },
        originalTitle: { type: String },

        youtubeLink: { type: String, required: true },
        videoId: { type: String, required: true, index: true },
        thumbnailUrl: { type: String },

        // --- 2. PHÂN LOẠI ---
        level: {
            type: String,
            enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            required: true,
            index: true,
        },
        topic: {
            type: String,
            enum: ['Daily Life', 'Technology', 'Business', 'Entertainment', 'News'],
            index: true,
        },
        tags: [{ type: String }],

        // --- 3. LIÊN KẾT (TÙY CHỌN) ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            default: null
        },

        // --- 4. NỘI DUNG BÀI TẬP ---
        segments: [VideoSegmentSchema],

        // --- 5. THỐNG KÊ ---
        totalGaps: { type: Number, default: 0 },
        views: { type: Number, default: 0 },

        // --- 6. TRẠNG THÁI ---
        isPublished: { type: Boolean, default: false },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

// Index text search
YoutubeListeningLessonSchema.index({ title: 'text', tags: 'text' });

export const YoutubeListeningLesson = mongoose.model<IYoutubeListeningLesson>('YoutubeListeningLesson', YoutubeListeningLessonSchema);
