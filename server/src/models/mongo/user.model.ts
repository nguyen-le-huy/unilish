import mongoose from 'mongoose';

// --- Enums & Types ---
export const EUserRole = {
    STUDENT: 'student',
    ADMIN: 'admin',
    CONTENT_CREATOR: 'content_creator',
} as const;

export const EAuthProvider = {
    LOCAL: 'local',
    GOOGLE: 'google',
} as const;

export const EGender = {
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
    PREFER_NOT_TO_SAY: 'prefer_not_to_say',
} as const;

export const ELevel = {
    // A0: Foundation (Level 0) - "Mất gốc"
    A0: 'A0',
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

// 6 Mục tiêu đề xuất (System Focus)
export const ELearningGoal = {
    COMMUNICATION: 'general_communication',  // Speaking + Listening
    EXAM_THPTQG: 'exam_thptqg',              // Grammar + Vocabulary + Reading
    EXAM_IELTS: 'exam_ielts',                // All 4 Skills (Academic)
    EXAM_TOEIC: 'exam_toeic',                // Listening + Reading (Business)
    BUSINESS: 'business_work',               // Writing + Speaking (Formal)
    TRAVEL: 'travel_survival',               // Listening + Speaking (Casual)
} as const;

export const EInterest = {
    TECHNOLOGY: 'technology',
    BUSINESS: 'business',
    ENTERTAINMENT: 'entertainment',
    HEALTH: 'health',
    SPORTS: 'sports',
    CULTURE: 'culture',
    DAILY_LIFE: 'daily_life',
} as const;

export const ESkill = {
    SPEAKING: 'speaking',
    LISTENING: 'listening',
    READING: 'reading',
    WRITING: 'writing',
    GRAMMAR: 'grammar',
    VOCABULARY: 'vocabulary',
    PRONUNCIATION: 'pronunciation',
} as const;

export const ESubscriptionPlan = {
    FREE: 'FREE',
    PREMIUM: 'PREMIUM',
} as const;

export const ESubscriptionStatus = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled', // NEW: Added cancelled status
} as const;

export interface IUser extends mongoose.Document {
    // --- 1. ĐỊNH DANH & BẢO MẬT (IDENTITY) ---
    email: string;
    googleId?: string;
    authProvider: typeof EAuthProvider[keyof typeof EAuthProvider];
    password?: string;
    isVerified: boolean;
    role: typeof EUserRole[keyof typeof EUserRole];

    // Internal Auth Fields (OTP)
    otp?: string;
    otpExpires?: Date;

    // --- 2. HỒ SƠ CÁ NHÂN (PROFILE) ---
    fullName: string;
    avatarUrl: string;
    dateOfBirth?: Date;
    phoneNumber?: string;
    gender?: typeof EGender[keyof typeof EGender];
    nativeLanguage: string | null; // NEW: Ngôn ngữ mẹ đẻ (vi, en, ja)

    // --- 3. TRẠNG THÁI ACTIVE (APP STATE) ---
    lastActiveAt: Date;
    lastActiveCourseId?: mongoose.Types.ObjectId; // NEW: Course đang học

    // --- 4. SỞ THÍCH (ADAPTIVE INPUT) ---
    interestIds: mongoose.Types.ObjectId[]; // NEW: Reference to Interest collection

    // --- 5. BỐI CẢNH HỌC TẬP (CONTEXTUAL LEARNING PROFILE) ---
    // A. Trình độ (CEFR Standard)
    currentLevel: keyof typeof ELevel;
    targetLevel: keyof typeof ELevel;

    // B. Mục tiêu học tập (Cốt lõi để định hướng lộ trình)
    learningGoal: keyof typeof ELearningGoal | string | null;

    // C. Sở thích (Legacy - now using interestIds)
    interests: string[];

    // D. Kỹ năng cần cải thiện (Dựa trên Placement Test)
    weakSkills: string[];

    // Điểm test đầu vào (Lưu để tham khảo lịch sử)
    placementTestScore: number;

    // --- 6. GAMIFICATION & RETENTION ---
    streakDays: number; // NEW: Chuỗi ngày học liên tiếp
    gamification: {     // NEW: Hệ thống game hóa
        totalXP: number;
        gems: number;
        level: number;
    };

    // --- 7. TRẠNG THÁI HỆ THỐNG (SYSTEM STATUS) ---
    subscription: {
        plan: typeof ESubscriptionPlan[keyof typeof ESubscriptionPlan];
        startDate?: Date; // NEW: Ngày bắt đầu
        endDate?: Date;
        status: typeof ESubscriptionStatus[keyof typeof ESubscriptionStatus];
    };

    settings: {
        dailyGoalMinutes: number;
        reminderTime: string; // NEW: Thời gian nhắc nhở
        appLanguage: string;  // NEW: Ngôn ngữ giao diện
        soundEffects: boolean; // NEW: Hiệu ứng âm thanh
        notification: boolean; // Legacy
    };

    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>(
    {
        // --- 1. ĐỊNH DANH & BẢO MẬT (IDENTITY) ---
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        authProvider: {
            type: String,
            enum: Object.values(EAuthProvider),
            default: EAuthProvider.LOCAL,
        },
        password: {
            type: String,
            select: false
        },
        isVerified: {
            type: Boolean,
            default: false
        },
        role: {
            type: String,
            enum: Object.values(EUserRole),
            default: EUserRole.STUDENT,
            index: true, // Enterprise: Indexed for Admin Dashboards
        },

        // Internal Auth Fields (OTP)
        otp: { type: String, select: false },
        otpExpires: { type: Date, select: false },

        // --- 2. HỒ SƠ CÁ NHÂN (PROFILE) ---
        fullName: { type: String, required: true, trim: true },
        avatarUrl: { type: String, default: null },
        dateOfBirth: { type: Date, default: null },
        phoneNumber: { type: String, default: null },
        gender: {
            type: String,
            enum: Object.values(EGender),
            default: EGender.PREFER_NOT_TO_SAY,
        },
        nativeLanguage: {
            type: String,
            default: null,
            index: true,
        },

        // --- 3. TRẠNG THÁI ACTIVE (APP STATE) ---
        lastActiveAt: { type: Date, default: Date.now, index: true },
        lastActiveCourseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            default: null,
        },

        // --- 4. SỞ THÍCH (ADAPTIVE INPUT) ---
        interestIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Interest',
        }],

        // --- 5. BỐI CẢNH HỌC TẬP (CONTEXTUAL LEARNING PROFILE) ---
        // A. Trình độ (CEFR Standard)
        currentLevel: {
            type: String,
            enum: Object.values(ELevel),
            default: ELevel.A0,
            index: true, // Enterprise: Indexed for Analytics
        },
        targetLevel: {
            type: String,
            enum: Object.values(ELevel),
            default: ELevel.B2
        },

        // B. Mục tiêu học tập (Cốt lõi để định hướng lộ trình)
        learningGoal: {
            type: String,
            default: null,
            index: true,
        },

        // C. Sở thích (Legacy - keeping for backward compatibility)
        interests: [{
            type: String,
            enum: Object.values(EInterest),
        }],

        // D. Kỹ năng cần cải thiện (Dựa trên Placement Test)
        weakSkills: [{
            type: String,
            enum: Object.values(ESkill),
        }],

        // Điểm test đầu vào (Lưu để tham khảo lịch sử)
        placementTestScore: { type: Number, default: 0 },

        // --- 6. GAMIFICATION & RETENTION ---
        streakDays: { type: Number, default: 0, index: true }, // Indexed for leaderboard
        gamification: {
            totalXP: { type: Number, default: 0, index: true }, // Indexed for leaderboard
            gems: { type: Number, default: 0 },
            level: { type: Number, default: 1 },
        },

        // --- 7. TRẠNG THÁI HỆ THỐNG (SYSTEM STATUS) ---
        subscription: {
            plan: {
                type: String,
                enum: Object.values(ESubscriptionPlan),
                default: ESubscriptionPlan.FREE
            },
            startDate: { type: Date, default: null },
            endDate: { type: Date, default: null },
            status: {
                type: String,
                enum: Object.values(ESubscriptionStatus),
                default: ESubscriptionStatus.ACTIVE,
                index: true, // Enterprise: Indexed for Subscription Management
            }
        },

        settings: {
            dailyGoalMinutes: { type: Number, default: 15 },
            reminderTime: { type: String, default: '20:00' },
            appLanguage: { type: String, default: 'vi' },
            soundEffects: { type: Boolean, default: true },
            notification: { type: Boolean, default: true }, // Legacy
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES (Enterprise Performance) ---
// Compound index for leaderboard queries
UserSchema.index({ 'gamification.totalXP': -1, streakDays: -1 });

// Compound index for subscription analytics
UserSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
