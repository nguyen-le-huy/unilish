import mongoose from 'mongoose';

// ============================================================
// ENUMS
// ============================================================

export const EUserRole = {
    STUDENT:         'student',
    ADMIN:           'admin',
    CONTENT_CREATOR: 'content_creator',
} as const;

export const EAuthProvider = {
    LOCAL:  'local',
    GOOGLE: 'google',
} as const;

export const EGender = {
    MALE:              'male',
    FEMALE:            'female',
    OTHER:             'other',
    PREFER_NOT_TO_SAY: 'prefer_not_to_say',
} as const;

export const ELevel = {
    A0: 'A0', // "Mất gốc" — Foundation
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

export const ESkill = {
    SPEAKING:      'speaking',
    LISTENING:     'listening',
    READING:       'reading',
    WRITING:       'writing',
    GRAMMAR:       'grammar',
    VOCABULARY:    'vocabulary',
    PRONUNCIATION: 'pronunciation',
} as const;

export const ESubscriptionPlan = {
    FREE:    'FREE',
    PREMIUM: 'PREMIUM',
} as const;

export const ESubscriptionStatus = {
    ACTIVE:    'active',
    EXPIRED:   'expired',
    CANCELLED: 'cancelled',
} as const;

export const ERenewalType = {
    MONTHLY: 'MONTHLY',
    YEARLY:  'YEARLY',
} as const;

// ============================================================
// INTERFACE
// ============================================================

export interface IUser extends mongoose.Document {
    // --- 1. ĐỊNH DANH & BẢO MẬT ---
    email:        string;
    googleId?:    string;
    authProvider: typeof EAuthProvider[keyof typeof EAuthProvider];
    password?:    string;
    isVerified:   boolean;
    role:         typeof EUserRole[keyof typeof EUserRole];
    otp?:         string | null;
    otpExpires?:  Date | null;

    // --- 2. HỒ SƠ CÁ NHÂN ---
    fullName:     string;
    avatarUrl:    string | null;
    dateOfBirth?: Date;
    phoneNumber?: string;
    gender?:      typeof EGender[keyof typeof EGender];

    // --- 3. TRẠNG THÁI ACTIVE ---
    lastActiveAt:       Date;
    lastActiveCourseId: mongoose.Types.ObjectId | null;

    // --- 4. BỐI CẢNH HỌC TẬP ---
    learningLanguageId: mongoose.Types.ObjectId | null;
    learningGoalId:     mongoose.Types.ObjectId | null;
    currentLevel:       keyof typeof ELevel;
    targetLevel:        keyof typeof ELevel;
    weakSkills:         (typeof ESkill[keyof typeof ESkill])[];
    placementTestScore: number;

    // --- 5. SUBSCRIPTION ---
    subscription: {
        plan:              typeof ESubscriptionPlan[keyof typeof ESubscriptionPlan];
        renewalType:       typeof ERenewalType[keyof typeof ERenewalType] | null;
        startDate:         Date | null;
        endDate:           Date | null;
        status:            typeof ESubscriptionStatus[keyof typeof ESubscriptionStatus];
        lastTransactionId: mongoose.Types.ObjectId | null;
    };

    // --- VIRTUALS ---
    isPremium: boolean;

    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// SCHEMA
// ============================================================

const UserSchema = new mongoose.Schema<IUser>(
    {
        // ── 1. ĐỊNH DANH & BẢO MẬT ─────────────────────────────
        email: {
            type:      String,
            required:  true,
            unique:    true,
            lowercase: true,
            trim:      true,
            index:     true,
        },
        googleId: {
            type:   String,
            unique: true,
            sparse: true, // unique nhưng không conflict với LOCAL users (null != null trong MongoDB)
            index:  true,
        },
        authProvider: {
            type:    String,
            enum:    Object.values(EAuthProvider),
            default: EAuthProvider.LOCAL,
        },
        password: {
            type:   String,
            select: false, // không bao giờ trả về trong API response
        },
        isVerified: {
            type:    Boolean,
            default: false,
        },
        role: {
            type:    String,
            enum:    Object.values(EUserRole),
            default: EUserRole.STUDENT,
            index:   true, // query Admin Dashboard
        },
        otp: {
            type:   String,
            select: false, // bảo mật
        },
        otpExpires: {
            type:   Date,
            select: false, // bảo mật
        },

        // ── 2. HỒ SƠ CÁ NHÂN ───────────────────────────────────
        fullName: {
            type:     String,
            required: true,
            trim:     true,
        },
        avatarUrl: {
            type:    String,
            default: null,
        },
        dateOfBirth: {
            type:    Date,
            default: null,
        },
        phoneNumber: {
            type:    String,
            default: null,
        },
        gender: {
            type:    String,
            enum:    Object.values(EGender),
            default: EGender.PREFER_NOT_TO_SAY,
        },

        // ── 3. TRẠNG THÁI ACTIVE ────────────────────────────────
        lastActiveAt: {
            type:    Date,
            default: Date.now,
            index:   true, // query user inactive để gửi re-engagement email
        },
        lastActiveCourseId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'Course',
            default: null, // dùng cho nút "Tiếp tục học" ở Home screen
        },

        // ── 4. BỐI CẢNH HỌC TẬP ────────────────────────────────

        // Ngôn ngữ đang theo học (ref Language collection)
        learningLanguageId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'Language',
            default: null,
            index:   true, // "có bao nhiêu user đang học tiếng Anh?"
        },

        // Mục tiêu học tập (ref LearningGoal collection)
        // populate để lấy systemPrompt + skillWeights cho AI
        learningGoalId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'LearningGoal',
            default: null,
            index:   true,
        },

        currentLevel: {
            type:    String,
            enum:    Object.values(ELevel),
            default: ELevel.A0,
            index:   true, // analytics phân bổ trình độ user
        },
        targetLevel: {
            type:    String,
            enum:    Object.values(ELevel),
            default: ELevel.B2,
        },
        weakSkills: [{
            type: String,
            enum: Object.values(ESkill),
        }],
        placementTestScore: {
            type:    Number,
            default: 0,
            min:     0,
            max:     100,
        },

        // ── 5. SUBSCRIPTION ─────────────────────────────────────
        subscription: {
            plan: {
                type:    String,
                enum:    Object.values(ESubscriptionPlan),
                default: ESubscriptionPlan.FREE,
            },
            renewalType: {
                type:    String,
                enum:    Object.values(ERenewalType), // null được cho phép vì field không có `required: true`
                default: null, // null = FREE (không có chu kỳ gia hạn)
            },
            startDate: {
                type:    Date,
                default: null,
            },
            endDate: {
                type:    Date,
                default: null,
            },
            status: {
                type:    String,
                enum:    Object.values(ESubscriptionStatus),
                default: ESubscriptionStatus.ACTIVE,
            },
            lastTransactionId: {
                type:    mongoose.Schema.Types.ObjectId,
                ref:     'Transaction',
                default: null, // audit trail khi user khiếu nại thanh toán
            },
        },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    }
);

// ============================================================
// INDEXES
// ============================================================

// Freemium analytics: COUNT(*) GROUP BY plan, status
UserSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

// Cron job nhắc gia hạn: tìm PREMIUM sắp hết hạn trong N ngày tới
UserSchema.index({ 'subscription.endDate': 1, 'subscription.plan': 1 });

// Query user theo trạng thái subscription (vd: tìm tất cả ACTIVE users)
UserSchema.index({ 'subscription.status': 1 });

// ============================================================
// VIRTUALS
// ============================================================

/**
 * isPremium — check nhanh quyền truy cập
 * Dùng trong AuthGuard / FeatureGate mà không cần query thêm collection
 */
UserSchema.virtual('isPremium').get(function (this: IUser): boolean {
    if (this.subscription.plan !== ESubscriptionPlan.PREMIUM) return false;
    if (this.subscription.status !== ESubscriptionStatus.ACTIVE) return false;
    if (this.subscription.endDate && this.subscription.endDate < new Date()) return false;
    return true;
});

// ============================================================
// MODEL
// ============================================================

export const User = mongoose.model<IUser>('User', UserSchema);
