import type { CourseAIAnalysis } from './ai-analysis.service.js';
import { generateBatchEmbeddings, generateEmbedding, truncateText } from '../utils/embeddings.js';

interface UserRecommendationProfile {
    currentLevel: string;
    languageName?: string | null;
    learningGoalName?: string | null;
}

interface CourseEmbeddingInput {
    name: string;
    level: string;
    description?: string | null;
}

export class EmbeddingService {
    async embedText(text: string): Promise<number[]> {
        return generateEmbedding(text);
    }

    async embedBatch(texts: string[]): Promise<number[][]> {
        return generateBatchEmbeddings(texts);
    }

    buildUserQueryText(user: UserRecommendationProfile): string {
        const parts = [
            user.languageName?.trim() ? `Học ngôn ngữ: ${user.languageName.trim()}.` : '',
            user.currentLevel?.trim() ? `Trình độ hiện tại: ${user.currentLevel.trim()}.` : '',
            user.learningGoalName?.trim() ? `Mục tiêu học tập: ${user.learningGoalName.trim()}.` : '',
        ].filter((part) => part.length > 0);

        return truncateText(parts.join(' '), 500);
    }

    buildCourseEmbedText(course: CourseEmbeddingInput): string {
        const parts = [
            course.name?.trim() ?? '',
            `Trình độ ${course.level?.trim() ?? 'A1'}.`,
            course.description?.trim() ?? '',
        ].filter((part) => part.length > 0);

        return truncateText(parts.join(' '), 1000);
    }

    buildEnrichedCourseEmbedText(course: CourseEmbeddingInput, aiAnalysis: CourseAIAnalysis | null): string {
        if (!aiAnalysis) {
            return this.buildCourseEmbedText(course);
        }

        const parts = [
            `${course.name?.trim() ?? ''} (Trình độ ${course.level?.trim() ?? 'A1'}).`,
            aiAnalysis.summary,
            aiAnalysis.topics.length > 0 ? `Chủ đề: ${aiAnalysis.topics.join(', ')}.` : '',
            aiAnalysis.skills.length > 0 ? `Kỹ năng: ${aiAnalysis.skills.join(', ')}.` : '',
            aiAnalysis.tags.length > 0 ? `Tags: ${aiAnalysis.tags.join(', ')}.` : '',
            aiAnalysis.useCase ? `Ngữ cảnh học tập: ${aiAnalysis.useCase}.` : '',
            aiAnalysis.audience ? `Đối tượng: ${aiAnalysis.audience}.` : '',
            course.description?.trim() ?? '',
        ].filter((part) => part.length > 0);

        return truncateText(parts.join(' '), 1200);
    }
}

export const embeddingService = new EmbeddingService();