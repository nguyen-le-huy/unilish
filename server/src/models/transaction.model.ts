import mongoose from 'mongoose';
import type { IUser } from './user.model.js';

export interface ITransaction extends mongoose.Document {
    userId: mongoose.Types.ObjectId | IUser;
    orderCode: number;
    amount: number;
    currency: string;
    description: string;
    planType: 'PLUS_MONTHLY' | 'PRO_MONTHLY' | 'PRO_YEARLY' | 'PRO_LIFETIME';
    durationInDays: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
    paymentLinkId?: string;
    checkoutUrl?: string;
    paidAt?: Date;
    webhookData?: any;
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new mongoose.Schema<ITransaction>(
    {
        // --- 1. THÔNG TIN CƠ BẢN ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        // --- 2. THÔNG TIN THANH TOÁN (PAYOS) ---
        orderCode: {
            type: Number,
            required: true,
            unique: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'VND',
        },
        description: {
            type: String,
            required: true,
        },

        // --- 3. THÔNG TIN GÓI MUA ---
        planType: {
            type: String,
            enum: ['PLUS_MONTHLY', 'PRO_MONTHLY', 'PRO_YEARLY', 'PRO_LIFETIME'],
            required: true,
        },
        durationInDays: {
            type: Number,
            default: 30,
        },

        // --- 4. TRẠNG THÁI GIAO DỊCH ---
        status: {
            type: String,
            enum: ['PENDING', 'PAID', 'CANCELLED', 'FAILED'],
            default: 'PENDING',
            index: true,
        },

        // --- 5. LOG & DEBUG ---
        paymentLinkId: {
            type: String,
        },
        checkoutUrl: {
            type: String,
        },
        paidAt: {
            type: Date,
        },

        // Lưu raw data từ Webhook PayOS
        webhookData: {
            type: mongoose.Schema.Types.Mixed,
            select: false,
        }
    },
    {
        timestamps: true,
    }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
