import mongoose from 'mongoose';

interface SpeakingTranscriptTurn {
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
}

interface SpeakingPostCallEvaluation {
    score: number;
    solvedMission: boolean;
    topGrammarMistakes: string[];
    summary: string;
    feedback: string;
    keywordCoverage: number;
}

interface SpeakingSessionMetrics {
    durationMs: number;
    audioChunkCount: number;
    aiTurnCount: number;
    endReason: 'user_initiated' | 'timeout' | 'error' | 'completed';
}

export interface IUserLessonProgress extends mongoose.Document {
    userId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    sessionId: string;
    traceId: string;
    sessionMetrics: SpeakingSessionMetrics;
    transcript: SpeakingTranscriptTurn[];
    evaluation: SpeakingPostCallEvaluation;
    createdAt: Date;
    updatedAt: Date;
}

const SpeakingTranscriptTurnSchema = new mongoose.Schema<SpeakingTranscriptTurn>(
    {
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        timestamp: {
            type: Number,
            required: true,
        },
    },
    { _id: false },
);

const SpeakingPostCallEvaluationSchema = new mongoose.Schema<SpeakingPostCallEvaluation>(
    {
        score: { type: Number, required: true, min: 0, max: 10 },
        solvedMission: { type: Boolean, required: true },
        topGrammarMistakes: {
            type: [String],
            required: true,
            default: [],
        },
        summary: { type: String, required: true, trim: true },
        feedback: { type: String, required: true, trim: true },
        keywordCoverage: { type: Number, required: true, min: 0, max: 1 },
    },
    { _id: false },
);

const SpeakingSessionMetricsSchema = new mongoose.Schema<SpeakingSessionMetrics>(
    {
        durationMs: { type: Number, required: true, min: 0 },
        audioChunkCount: { type: Number, required: true, min: 0 },
        aiTurnCount: { type: Number, required: true, min: 0 },
        endReason: {
            type: String,
            enum: ['user_initiated', 'timeout', 'error', 'completed'],
            required: true,
        },
    },
    { _id: false },
);

const UserLessonProgressSchema = new mongoose.Schema<IUserLessonProgress>(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        lessonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lesson',
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        traceId: {
            type: String,
            required: true,
            index: true,
        },
        sessionMetrics: {
            type: SpeakingSessionMetricsSchema,
            required: true,
        },
        transcript: {
            type: [SpeakingTranscriptTurnSchema],
            default: [],
            required: true,
        },
        evaluation: {
            type: SpeakingPostCallEvaluationSchema,
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

UserLessonProgressSchema.index({ userId: 1, lessonId: 1, createdAt: -1 });

export const UserLessonProgress = mongoose.model<IUserLessonProgress>('UserLessonProgress', UserLessonProgressSchema);
