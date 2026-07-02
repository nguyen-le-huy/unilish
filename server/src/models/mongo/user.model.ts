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
            sparse: true,
            index:  true,
        },
        authProvider: {
            type:    String,
            enum:    Object.values(EAuthProvider),
            default: EAuthProvider.LOCAL,
        },
        password: {
            type:   String,
            select: false,
        },
        isVerified: {
            type:    Boolean,
            default: false,
        },
        role: {
            type:    String,
            enum:    Object.values(EUserRole),
            default: EUserRole.STUDENT,
            index:   true,
        },
        otp: {
            type:   String,
            select: false,
        },
        otpExpires: {
            type:   Date,
            select: false,
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
            index:   true,
        },
        lastActiveCourseId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'Course',
            default: null,
        },

        // ── 4. BỐI CẢNH HỌC TẬP ────────────────────────────────
        learningLanguageId: {
            type:    mongoose.Schema.Types.ObjectId,
            ref:     'Language',
            default: null,
            index:   true,
        },
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
            index:   true,
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
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    }
);

// ── INDEXES ─────────────────────────────────

UserSchema.index({ role: 1, currentLevel: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
