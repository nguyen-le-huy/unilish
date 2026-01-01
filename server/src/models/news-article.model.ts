import mongoose from 'mongoose';

interface INewsVocab {
    word: string;
    meaning: string;
    ipa?: string;
    pos?: string;
}

interface INewsQuiz {
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
}

export interface INewsArticle extends mongoose.Document {
    originalUrl: string;
    sourceName: string;
    publishedAt: Date;
    title: string;
    slug: string;
    summary?: string;
    thumbnailUrl?: string;
    content: string;
    audioUrl?: string;
    difficultyLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    category?: 'TECHNOLOGY' | 'BUSINESS' | 'HEALTH' | 'TRAVEL' | 'WORLD';
    readTimeMinutes: number;
    vocabulary: INewsVocab[];
    quizzes: INewsQuiz[];
    views: number;
    likes: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// --- SUB-SCHEMA 1: TỪ VỰNG TRONG BÀI (EMBEDDED) ---
const NewsVocabSchema = new mongoose.Schema({
    word: { type: String, required: true },
    meaning: { type: String, required: true },
    ipa: { type: String },
    pos: { type: String },
}, { _id: true });

// --- SUB-SCHEMA 2: QUIZ NHANH (EMBEDDED) ---
const NewsQuizSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctIndex: { type: Number, required: true },
    explanation: { type: String }
}, { _id: true });

const NewsArticleSchema = new mongoose.Schema(
    {
        // --- 1. THÔNG TIN GỐC ---
        originalUrl: {
            type: String,
            required: true,
            unique: true
        },
        sourceName: { type: String, default: 'CNN' },
        publishedAt: { type: Date, default: Date.now },

        // --- 2. NỘI DUNG ĐÃ XỬ LÝ ---
        title: {
            type: String,
            required: true,
            index: 'text'
        },
        slug: {
            type: String,
            unique: true,
            index: true
        },
        summary: { type: String },
        thumbnailUrl: { type: String },

        // Nội dung HTML đã được AI "xào nấu"
        content: {
            type: String,
            required: true
        },

        // Giọng đọc AI 
        audioUrl: { type: String },

        // --- 3. PHÂN TÍCH CỦA AI ---
        difficultyLevel: {
            type: String,
            enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
            index: true,
        },
        category: {
            type: String,
            enum: ['TECHNOLOGY', 'BUSINESS', 'HEALTH', 'TRAVEL', 'WORLD'],
            index: true,
        },
        readTimeMinutes: { type: Number, default: 3 },

        // --- 4. TÀI NGUYÊN HỌC TẬP (EMBEDDED) ---
        vocabulary: [NewsVocabSchema],
        quizzes: [NewsQuizSchema],

        // --- 5. TƯƠNG TÁC ---
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

// Tạo Index tổng hợp để filter nhanh trang News Feed
NewsArticleSchema.index({ category: 1, difficultyLevel: 1, publishedAt: -1 });

export const NewsArticle = mongoose.model<INewsArticle>('NewsArticle', NewsArticleSchema);
