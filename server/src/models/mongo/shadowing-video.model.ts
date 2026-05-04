import mongoose from 'mongoose';

export type ShadowingVideoStatus = 'processing' | 'ready' | 'failed';

export interface IShadowingCue {
    id: string;
    text: string;
    startMs: number;
    endMs: number;
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
