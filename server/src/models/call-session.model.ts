import mongoose from 'mongoose';
import type { IUser } from './user.model.js';

interface IReview {
    reviewerId: mongoose.Types.ObjectId | IUser;
    rating: number;
    tags?: string[];
    comment?: string;
    isReported: boolean;
    reportReason?: 'HARASSMENT' | 'INAPPROPRIATE_CONTENT' | 'SPAM' | 'OTHER';
}

export interface ICallSession extends mongoose.Document {
    callerId: mongoose.Types.ObjectId | IUser;
    receiverId: mongoose.Types.ObjectId | IUser;
    topic: string;
    targetLevel?: string;
    language: string;
    status: 'ONGOING' | 'COMPLETED' | 'MISSED' | 'DECLINED' | 'ERROR';
    startTime: Date;
    endTime?: Date;
    durationSeconds: number;
    reviews: IReview[];
    disconnectReason?: 'USER_HANGUP' | 'NETWORK_ERROR' | 'TIMEOUT' | 'BROWSER_CLOSED';
    xpEarned: number;
    createdAt: Date;
    updatedAt: Date;
}

// Sub-schema: Đánh giá sau cuộc gọi
const ReviewSchema = new mongoose.Schema({
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    tags: [{ type: String }],
    comment: { type: String },

    // Báo cáo vi phạm
    isReported: { type: Boolean, default: false },
    reportReason: {
        type: String,
        enum: ['HARASSMENT', 'INAPPROPRIATE_CONTENT', 'SPAM', 'OTHER']
    }
}, { _id: false });

const CallSessionSchema = new mongoose.Schema(
    {
        // --- 1. NGƯỜI THAM GIA ---
        callerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // --- 2. CẤU HÌNH CUỘC GỌI ---
        topic: {
            type: String,
            default: 'FREE_TALK',
        },
        targetLevel: {
            type: String,
        },
        language: { type: String, default: 'en' },

        // --- 3. TRẠNG THÁI & THỜI GIAN ---
        status: {
            type: String,
            enum: ['ONGOING', 'COMPLETED', 'MISSED', 'DECLINED', 'ERROR'],
            default: 'ONGOING',
        },
        startTime: { type: Date, default: Date.now },
        endTime: { type: Date },
        durationSeconds: { type: Number, default: 0 },

        // --- 4. CHẤT LƯỢNG & ĐÁNH GIÁ ---
        reviews: [ReviewSchema],

        // --- 5. KỸ THUẬT ---
        disconnectReason: {
            type: String,
            enum: ['USER_HANGUP', 'NETWORK_ERROR', 'TIMEOUT', 'BROWSER_CLOSED'],
        },

        // --- 6. PHẦN THƯỞNG ---
        xpEarned: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Index: Tìm lịch sử cuộc gọi của một user
CallSessionSchema.index({ callerId: 1, startTime: -1 });
CallSessionSchema.index({ receiverId: 1, startTime: -1 });

export const CallSession = mongoose.model<ICallSession>('CallSession', CallSessionSchema);
