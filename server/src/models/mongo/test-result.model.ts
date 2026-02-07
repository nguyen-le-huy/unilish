import mongoose from 'mongoose';
import type { IUser } from './user.model.js';
import type { IQuestion } from './question.model.js';

export interface ITestResult extends mongoose.Document {
    userId: mongoose.Types.ObjectId | IUser;
    type: 'PLACEMENT_TEST' | 'LEVEL_MASTERY_TEST';
    targetLevel?: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
    startedAt: Date;
    completedAt?: Date;
    durationSeconds?: number;
    totalScore: number;
    passed: boolean;
    recommendedLevel?: string;
    skillScores: {
        vocabulary: number;
        grammar: number;
        reading: number;
        listening: number;
        speaking: number;
        writing: number;
    };
    answers: Array<{
        questionId: mongoose.Types.ObjectId | IQuestion;
        userAnswer: any;
        isCorrect: boolean;
        point: number;
    }>;
    teacherComment?: string;
    certificateUrl?: string;
    certificateId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TestResultSchema = new mongoose.Schema<ITestResult>(
    {
        // --- 1. ĐỊNH DANH ---
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Loại bài thi
        type: {
            type: String,
            enum: ['PLACEMENT_TEST', 'LEVEL_MASTERY_TEST'],
            required: true,
        },
        // Nếu là bài thi tốt nghiệp, thi cho Level nào?
        targetLevel: {
            type: String,
        },

        // --- 2. TRẠNG THÁI & THỜI GIAN ---
        status: {
            type: String,
            enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
            default: 'IN_PROGRESS',
        },
        startedAt: { type: Date, default: Date.now },
        completedAt: { type: Date },
        durationSeconds: { type: Number },

        // --- 3. KẾT QUẢ TỔNG QUAN ---
        totalScore: { type: Number, default: 0 },
        passed: { type: Boolean, default: false },

        // Kết quả Placement Test
        recommendedLevel: { type: String },

        // --- 4. PHÂN TÍCH KỸ NĂNG (REPORT CARD) ---
        skillScores: {
            vocabulary: { type: Number, default: 0 },
            grammar: { type: Number, default: 0 },
            reading: { type: Number, default: 0 },
            listening: { type: Number, default: 0 },
            speaking: { type: Number, default: 0 },
            writing: { type: Number, default: 0 },
        },

        // --- 5. CHI TIẾT BÀI LÀM (REVIEW) ---
        answers: [
            {
                questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
                userAnswer: { type: mongoose.Schema.Types.Mixed },
                isCorrect: { type: Boolean },
                point: { type: Number },
            }
        ],

        // --- 6. AI FEEDBACK ---
        teacherComment: { type: String },

        // --- 7. CHỨNG CHỈ ---
        certificateUrl: { type: String },
        certificateId: { type: String, unique: true, sparse: true },
    },
    { timestamps: true }
);

// Index: Mỗi User chỉ nên có 1 kết quả mới nhất cho 1 Level
TestResultSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const TestResult = mongoose.model<ITestResult>('TestResult', TestResultSchema);
