import mongoose from 'mongoose';

// --- Enums & Types ---
export const ETTSProvider = {
    OPENAI: 'OPENAI',
    AZURE: 'AZURE',
    ELEVENLABS: 'ELEVENLABS',
} as const;

export interface ILanguage extends mongoose.Document {
    // --- 1. BASIC INFO ---
    code: string; // 'en', 'ja', 'vi'
    name: string; // 'English'
    nativeName: string; // 'Tiếng Anh'
    flagIconUrl?: string;

    // --- 2. AI TEXT-TO-SPEECH CONFIG ---
    ttsConfig: {
        provider: typeof ETTSProvider[keyof typeof ETTSProvider];
        voiceId?: string; // 'alloy', 'en-US-JennyNeural'
        style?: string;
        speed: number;
    };

    // --- 3. STATUS ---
    isActive: boolean;

    // --- 4. METADATA ---
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
        flagIconUrl: {
            type: String,
            default: null,
        },

        // --- 2. AI TEXT-TO-SPEECH CONFIG ---
        ttsConfig: {
            provider: {
                type: String,
                enum: Object.values(ETTSProvider),
                default: ETTSProvider.OPENAI,
            },
            voiceId: {
                type: String,
                default: null,
            },
            style: {
                type: String,
                default: null,
            },
            speed: {
                type: Number,
                min: 0.8,
                max: 1.2,
                default: 1,
            },
        },

        // --- 3. STATUS ---
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
