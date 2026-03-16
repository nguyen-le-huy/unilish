import mongoose from 'mongoose';

export interface ILanguage extends mongoose.Document {
    // --- 1. BASIC INFO ---
    code: string; // 'en', 'ja', 'vi'
    name: string; // 'English'
    nativeName: string; // 'Tiếng Anh'
    greeting?: string;
    greetingSound?: string;
    flagIconUrl?: string;

    // --- 2. STATUS ---
    isActive: boolean;

    // --- 3. METADATA ---
    createdAt: Date;
    updatedAt: Date;
}

const LanguageSchema = new mongoose.Schema<ILanguage>(
    {
        // --- 1. BASIC INFO ---
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        nativeName: {
            type: String,
            required: true,
            trim: true,
        },
        greeting: {
            type: String,
            default: null,
            trim: true,
        },
        greetingSound: {
            type: String,
            default: null,
        },
        flagIconUrl: {
            type: String,
            default: null,
        },

        // --- 2. STATUS ---
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// --- INDEXES ---
LanguageSchema.index({ code: 1 }, { unique: true });
LanguageSchema.index({ isActive: 1 });

export const Language = mongoose.model<ILanguage>('Language', LanguageSchema);
