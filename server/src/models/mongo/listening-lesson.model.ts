import mongoose from 'mongoose';
import type { IUnit } from './unit.model.js';
import type { IVocabulary } from './vocabulary.model.js';

interface ITranscriptWord {
    word: string;
    start: number;
    end: number;
    isGap: boolean;
    vocabId?: mongoose.Types.ObjectId | IVocabulary;
    hint?: string;
}

interface ISpeaker {
    id: string;
    name: string;
    avatarUrl?: string;
    role?: string;
}

interface IDialogueSegment {
    speakerId: string;
    text: string;
    startTime: number;
    endTime: number;
}

export interface IListeningLesson extends mongoose.Document {
    unitId: mongoose.Types.ObjectId | IUnit;
    title: string;
    description?: string;
    mediaType: 'AUDIO' | 'VIDEO';
    mediaUrl: string;
    duration?: number;
    transcript: ITranscriptWord[];
    speakers: ISpeaker[];
    dialogueSegments: IDialogueSegment[];
    createdAt: Date;
    updatedAt: Date;
}

// Sub-schema: Cấu trúc của từng TỪ trong đoạn hội thoại
const TranscriptWordSchema = new mongoose.Schema({
    word: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },

    // --- GAP FILL LOGIC ---
    isGap: { type: Boolean, default: false },

    // Liên kết với bảng Vocabulary
    vocabId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary' },

    // Gợi ý
    hint: { type: String }
}, { _id: false });

const ListeningLessonSchema = new mongoose.Schema(
    {
        // --- 1. LIÊN KẾT ---
        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unit',
            required: true,
            unique: true,
            index: true,
        },

        // --- 2. THÔNG TIN CƠ BẢN ---
        title: { type: String, required: true },
        description: { type: String },

        // --- 3. MEDIA SOURCE ---
        mediaType: {
            type: String,
            enum: ['AUDIO', 'VIDEO'],
            default: 'AUDIO',
        },
        mediaUrl: {
            type: String,
            required: true
        },
        duration: { type: Number },

        // --- 4. TRANSCRIPT THÔNG MINH ---
        transcript: [TranscriptWordSchema],

        // --- 5. HỘI THOẠI (SPEAKER MAPPING) ---
        speakers: [
            {
                id: { type: String },
                name: { type: String },
                avatarUrl: { type: String },
                role: { type: String }
            }
        ],
        dialogueSegments: [{
            speakerId: String,
            text: String,
            startTime: Number,
            endTime: Number
        }]
    },
    { timestamps: true }
);

export const ListeningLesson = mongoose.model<IListeningLesson>('ListeningLesson', ListeningLessonSchema);
