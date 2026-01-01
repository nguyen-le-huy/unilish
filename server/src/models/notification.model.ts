import mongoose from 'mongoose';
import type { IUser } from './user.model.js';

export interface INotification extends mongoose.Document {
    userId: mongoose.Types.ObjectId | IUser;
    title: string;
    message: string;
    image?: string;
    type: 'SYSTEM' | 'LEARNING' | 'ACHIEVEMENT' | 'PAYMENT' | 'SOCIAL' | 'PROMOTION';
    isRead: boolean;
    actionLink?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new mongoose.Schema<INotification>(
    {
        // --- 1. NGƯỜI NHẬN ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // --- 2. NỘI DUNG HIỂN THỊ ---
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            default: null,
        },

        // --- 3. PHÂN LOẠI & TRẠNG THÁI ---
        type: {
            type: String,
            enum: [
                'SYSTEM',         // Thông báo bảo trì, cập nhật App
                'LEARNING',       // Nhắc nhở học tập (Streak), Bài tập mới
                'ACHIEVEMENT',    // Nhận huy hiệu, lên cấp, có chứng chỉ
                'PAYMENT',        // Thanh toán thành công/thất bại
                'SOCIAL',         // Kết quả report P2P, hoặc tin nhắn từ Admin
                'PROMOTION'       // Khuyến mãi
            ],
            default: 'SYSTEM',
        },
        isRead: {
            type: Boolean,
            default: false,
        },

        // --- 4. HÀNH ĐỘNG (ACTION / DEEP LINK) ---
        actionLink: {
            type: String, // VD: "/certificate/123" hoặc "/billing/history"
            default: null,
        },

        // Dữ liệu mở rộng
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// --- 5. INDEX OPTIMIZATION (TTL) ---
// Tự động xóa thông báo cũ sau 30 ngày
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
