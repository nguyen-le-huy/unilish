import mongoose from 'mongoose';
import type { IUser } from './user.model.js';
import type { IUnit } from './unit.model.js';
import type { IModule } from './module.model.js';

interface IChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: {
        sourceId: string;
        title: string;
        snippet: string;
        url: string;
    }[];
    rating?: 'thumbs_up' | 'thumbs_down';
    createdAt: Date;
}

export interface IChatSession extends mongoose.Document {
    userId: mongoose.Types.ObjectId | IUser;
    title: string;
    context?: {
        unitId?: mongoose.Types.ObjectId | IUnit;
        moduleId?: mongoose.Types.ObjectId | IModule;
        topic?: string;
    };
    messages: IChatMessage[];
    isActive: boolean;
    tokenUsage: number;
    createdAt: Date;
    updatedAt: Date;
}

// --- SUB-SCHEMA: CẤU TRÚC 1 TIN NHẮN ---
const MessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },

    // --- RAG CITATIONS ---
    sources: [
        {
            sourceId: String,
            title: String,
            snippet: String,
            url: String
        }
    ],

    // Feedback
    rating: {
        type: String,
        enum: ['thumbs_up', 'thumbs_down'],
        default: null
    },

    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const ChatSessionSchema = new mongoose.Schema(
    {
        // --- 1. ĐỊNH DANH ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // --- 2. TIÊU ĐỀ PHIÊN CHAT ---
        title: {
            type: String,
            default: 'New Conversation',
        },

        // --- 3. NGỮ CẢNH CỤ THỂ ---
        context: {
            unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
            moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
            topic: String
        },

        // --- 4. NỘI DUNG ---
        messages: [MessageSchema],

        // --- 5. QUẢN LÝ ---
        isActive: { type: Boolean, default: true },
        tokenUsage: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Index: Lấy danh sách chat history của user
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
