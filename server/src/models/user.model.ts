import mongoose from 'mongoose';
import { GameLevelUtils } from '../utils/game-level.js';

export interface IUser extends mongoose.Document {
    email: string;
    clerkId?: string;
    password?: string;
    authProvider: 'local' | 'google' | 'facebook';
    otp?: string | undefined;
    otpExpires?: Date | undefined;
    isVerified: boolean;
    role: 'student' | 'admin' | 'content_creator';
    fullName: string;
    avatarUrl: string;
    dateOfBirth?: Date;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phoneNumber?: string;
    bio?: string;
    address?: {
        country: string;
        city: string;
    };
    currentLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    targetLevel: string;
    placementTestScore: number;
    weakSkills: string[];
    subscription: {
        plan: 'FREE' | 'PLUS' | 'PRO';
        startDate?: Date;
        endDate?: Date;
        status: 'active' | 'expired' | 'cancelled';
        autoRenew: boolean;
    };
    stats: {
        xp: number;
        coins: number;
        streak: number;
        longestStreak: number;
        lastActiveAt: Date;
    };
    settings: {
        notification: boolean;
        nativeLanguage: string;
    };
    createdAt: Date;
    updatedAt: Date;
    updateStreak(): Promise<IUser>;
}

const UserSchema = new mongoose.Schema<IUser>(
    {
        // --- 1. NHÓM ĐỊNH DANH & BẢO MẬT (IDENTITY & AUTH) ---
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        clerkId: {
            type: String,
            unique: true,
            sparse: true,
        },
        password: {
            type: String,
            select: false,
        },
        authProvider: {
            type: String,
            enum: ['local', 'google', 'facebook'],
            default: 'local',
        },
        otp: {
            type: String,
            select: false,
        },
        otpExpires: {
            type: Date,
            select: false,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        role: {
            type: String,
            enum: ['student', 'admin', 'content_creator'],
            default: 'student',
        },

        // --- 2. NHÓM THÔNG TIN CÁ NHÂN (PROFILE) ---
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        avatarUrl: {
            type: String,
            default: 'https://res.cloudinary.com/demo/image/upload/v1/default_avatar.png',
        },
        dateOfBirth: {
            type: Date,
            default: null,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say'],
            default: 'prefer_not_to_say',
        },
        phoneNumber: {
            type: String,
            default: null,
        },
        bio: {
            type: String,
            default: '',
            trim: true,
        },
        address: {
            country: { type: String, default: 'Việt Nam' },
            city: { type: String, default: 'Hà Nội' },
        },

        // --- 3. NHÓM HỌC TẬP (ACADEMIC STATUS) ---
        currentLevel: {
            type: String,
            enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            default: 'A1',
        },
        targetLevel: {
            type: String,
            default: 'C1',
        },
        placementTestScore: {
            type: Number,
            default: 0,
        },
        weakSkills: [{
            type: String,
            enum: ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary'],
        }],

        // --- 4. NHÓM GÓI CƯỚC (SUBSCRIPTION) ---
        subscription: {
            plan: {
                type: String,
                enum: ['FREE', 'PLUS', 'PRO'],
                default: 'FREE',
            },
            startDate: { type: Date },
            endDate: { type: Date },
            status: {
                type: String,
                enum: ['active', 'expired', 'cancelled'],
                default: 'active',
            },
            autoRenew: { type: Boolean, default: false },
        },

        // --- 5. NHÓM GAMIFICATION (GAME HÓA) ---
        stats: {
            xp: { type: Number, default: 0 },
            coins: { type: Number, default: 0 },
            streak: { type: Number, default: 0 },
            longestStreak: { type: Number, default: 0 },
            lastActiveAt: { type: Date, default: Date.now },
        },

        // --- 6. SETTINGS (CÀI ĐẶT) ---
        settings: {
            notification: { type: Boolean, default: true },
            nativeLanguage: { type: String, default: 'vi' },
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Pre-save hook to enforce Admin Stats
// Nếu là Admin, luôn set chỉ số Max trước khi lưu vào DB
UserSchema.pre('save', async function () {
    if (this.role === 'admin') {
        this.stats.xp = 20000;
        this.stats.coins = 999999;
        this.stats.streak = 365;
        this.stats.longestStreak = 365;
        this.currentLevel = 'C2';
    }
});

// Virtual: Tính Level game (RPG) từ XP
// Sử dụng logic chuẩn doanh nghiệp từ utils
UserSchema.virtual('gameLevel').get(function () {
    const xp = this.stats.xp || 0;
    const { level } = GameLevelUtils.calculateLevelFromXp(xp);
    return level;
});

// Method: Tính toán Streak
UserSchema.methods.updateStreak = async function () {
    const now = new Date();
    const lastActive = new Date(this.stats.lastActiveAt);

    // Logic tính ngày: Reset nếu quá 48h, Tăng nếu trong vòng 24-48h
    const diffTime = Math.abs(now.getTime() - lastActive.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) { // Học liên tiếp
        this.stats.streak += 1;
        if (this.stats.streak > this.stats.longestStreak) {
            this.stats.longestStreak = this.stats.streak;
        }
    } else if (diffDays > 1) { // Bỏ học 1 ngày -> Reset
        this.stats.streak = 1;
    }

    this.stats.lastActiveAt = now;
    return this.save();
};

export const User = mongoose.model<IUser>('User', UserSchema);
