import mongoose from 'mongoose';

export type ShadowingVideoStatus = 'processing' | 'ready' | 'failed';

export interface IShadowingCue {
    id: string;
    text: string;
    translationVi?: string | null;
    vocabulary: ShadowingCueVocabulary[];
    commonPhrases: ShadowingCuePhrase[];
    startMs: number;
    endMs: number;
}

export interface ShadowingCueVocabulary {
    word: string;
    pos: string;
    translationVi: string;
    ipa: string;
}

export interface ShadowingCuePhrase {
    phrase: string;
    translationVi: string;
}

export interface IShadowingVideo extends mongoose.Document {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    durationSeconds: number;
    addedBy: mongoose.Types.ObjectId;
    cues: IShadowingCue[];
    status: ShadowingVideoStatus;
    createdAt: Date;
    updatedAt: Date;
}

const ShadowingCueSchema = new mongoose.Schema<IShadowingCue>(
    {
        id: { type: String, required: true, trim: true },
        text: { type: String, required: true, trim: true },
        translationVi: { type: String, trim: true },
        vocabulary: {
            type: [
                new mongoose.Schema<ShadowingCueVocabulary>(
                    {
                        word: { type: String, required: true, trim: true },
                        pos: { type: String, required: true, trim: true },
                        translationVi: { type: String, required: true, trim: true },
                        ipa: { type: String, required: true, trim: true },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        commonPhrases: {
            type: [
                new mongoose.Schema<ShadowingCuePhrase>(
                    {
                        phrase: { type: String, required: true, trim: true },
                        translationVi: { type: String, required: true, trim: true },
                    },
                    { _id: false },
                ),
            ],
            default: [],
        },
        startMs: { type: Number, required: true, min: 0 },
        endMs: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);

const ShadowingVideoSchema = new mongoose.Schema<IShadowingVideo>(
    {
        videoId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        thumbnailUrl: {
            type: String,
            required: true,
            trim: true,
        },
        durationSeconds: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        cues: {
            type: [ShadowingCueSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ['processing', 'ready', 'failed'],
            default: 'processing',
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: 'shadowing_videos',
    },
);

ShadowingVideoSchema.index({ createdAt: -1 });

export const ShadowingVideo = mongoose.model<IShadowingVideo>('ShadowingVideo', ShadowingVideoSchema);
