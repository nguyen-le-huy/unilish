import mongoose from 'mongoose';

export interface ILanguage extends mongoose.Document {
    code: string;       // ISO 639-1: 'en', 'vi', 'jp'
    name: string;       // 'English'
    nativeName: string; // 'Tiếng Việt'
    flagUrl: string;
    isActive: boolean;
    isBeta: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const LanguageSchema = new mongoose.Schema<ILanguage>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        nativeName: {
            type: String,
            required: true,
            trim: true
        },
        flagUrl: {
            type: String,
            default: ''
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isBeta: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

export const Language = mongoose.model<ILanguage>('Language', LanguageSchema);
