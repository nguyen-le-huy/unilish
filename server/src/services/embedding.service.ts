import type { CourseSeriesLevelRange } from '../models/vector/course-series-vector.js';
import { parseCourseSeriesLevelRange } from '../models/vector/course-series-vector.js';
import type { SeriesAIAnalysis } from './ai-analysis.service.js';
import { generateBatchEmbeddings, generateEmbedding, truncateText } from '../utils/embeddings.js';

interface UserRecommendationProfile {
    currentLevel: string;
    languageName?: string | null;
    learningGoalName?: string | null;
}

interface CourseSeriesEmbeddingInput {
    title: string;
    description?: string | null;
}

export class EmbeddingService {
    async embedText(text: string): Promise<number[]> {
        return generateEmbedding(text);
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        return generateBatchEmbeddings(texts);
    }

    parseLevelRange(title: string): CourseSeriesLevelRange {
        return parseCourseSeriesLevelRange(title);
    }

    buildSeriesEmbedText(series: CourseSeriesEmbeddingInput): string {
        const { levelMin, levelMax } = this.parseLevelRange(series.title ?? '');

        const parts = [
            series.title?.trim() ?? '',
            `Trình độ ${levelMin}-${levelMax}.`,
            series.description?.trim() ?? '',
        ].filter((part) => part.length > 0);

        return truncateText(parts.join(' '), 1000);
    }

    buildUserQueryText(user: UserRecommendationProfile): string {
        const parts = [
            user.languageName?.trim() ? `Học ngôn ngữ: ${user.languageName.trim()}.` : '',
            user.currentLevel?.trim() ? `Trình độ hiện tại: ${user.currentLevel.trim()}.` : '',
            user.learningGoalName?.trim() ? `Mục tiêu học tập: ${user.learningGoalName.trim()}.` : '',
        ].filter((part) => part.length > 0);

        return truncateText(parts.join(' '), 500);
    }

    buildEnrichedEmbedText(series: CourseSeriesEmbeddingInput, aiAnalysis: SeriesAIAnalysis | null): string {
        if (!aiAnalysis) {
            return this.buildSeriesEmbedText(series);
        }

        const parts = [
            `${series.title?.trim() ?? ''} (${aiAnalysis.levelMin}-${aiAnalysis.levelMax}).`,
            aiAnalysis.summary,
            aiAnalysis.topics.length > 0 ? `Chủ đề: ${aiAnalysis.topics.join(', ')}.` : '',
            aiAnalysis.skills.length > 0 ? `Kỹ năng: ${aiAnalysis.skills.join(', ')}.` : '',
            aiAnalysis.tags.length > 0 ? `Tags: ${aiAnalysis.tags.join(', ')}.` : '',
            aiAnalysis.useCase ? `Ngữ cảnh học tập: ${aiAnalysis.useCase}.` : '',
            aiAnalysis.audience ? `Đối tượng: ${aiAnalysis.audience}.` : '',
            series.description?.trim() ?? '',
        ].filter((part) => part.length > 0);

        return truncateText(parts.join(' '), 1200);
    }
}

export const embeddingService = new EmbeddingService();