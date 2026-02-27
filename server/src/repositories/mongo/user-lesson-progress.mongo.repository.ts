import mongoose from 'mongoose';

import { UserLessonProgress } from '../../models/mongo/user-lesson-progress.model.js';

interface SavedSpeakingProgress {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    sessionId: string;
    traceId: string;
    sessionMetrics: {
        durationMs: number;
        audioChunkCount: number;
        aiTurnCount: number;
        endReason: 'user_initiated' | 'timeout' | 'error' | 'completed';
    };
    transcript: Array<{
        role: 'user' | 'assistant';
        text: string;
        timestamp: number;
    }>;
    evaluation: {
        score: number;
        solvedMission: boolean;
        topGrammarMistakes: string[];
        summary: string;
        feedback: string;
        keywordCoverage: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

interface SaveSpeakingProgressPayload {
    userId: string;
    lessonId: string;
    sessionId: string;
    traceId: string;
    sessionMetrics: {
        durationMs: number;
        audioChunkCount: number;
        aiTurnCount: number;
        endReason: 'user_initiated' | 'timeout' | 'error' | 'completed';
    };
    transcript: Array<{
        role: 'user' | 'assistant';
        text: string;
        timestamp: number;
    }>;
    evaluation: {
        score: number;
        solvedMission: boolean;
        topGrammarMistakes: string[];
        summary: string;
        feedback: string;
        keywordCoverage: number;
    };
}

export class UserLessonProgressMongoRepository {
    async saveSpeakingProgress(payload: SaveSpeakingProgressPayload): Promise<SavedSpeakingProgress> {
        const saved = await UserLessonProgress.findOneAndUpdate(
            { sessionId: payload.sessionId },
            {
                $set: {
                    userId: new mongoose.Types.ObjectId(payload.userId),
                    lessonId: new mongoose.Types.ObjectId(payload.lessonId),
                    traceId: payload.traceId,
                    sessionMetrics: payload.sessionMetrics,
                    transcript: payload.transcript,
                    evaluation: payload.evaluation,
                },
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            },
        )
            .select('-__v')
            .lean()
            .exec() as SavedSpeakingProgress | null;

        if (!saved) {
            throw new Error('Failed to persist speaking progress');
        }

        return saved;
    }
}

export type { SaveSpeakingProgressPayload, SavedSpeakingProgress };
