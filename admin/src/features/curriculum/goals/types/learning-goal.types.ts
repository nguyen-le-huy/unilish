// NOTE: Language is re-exported from the languages feature public barrel
export type { Language } from '@/features/curriculum/languages';

export interface LearningGoal {
    _id: string;
    slug: string;
    title: string;
    iconUrl?: string | null;
    description?: string | null;
    targetAudience?: string | null;
    supportedLanguages: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LearningGoalListResponse {
    data: LearningGoal[];
    meta: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface LearningGoalListQuery {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

export interface CreateLearningGoalPayload {
    slug: string;
    title: string;
    iconUrl?: string;
    description?: string;
    targetAudience?: string;
    supportedLanguages: string[];
    isActive: boolean;
}

export interface UpdateLearningGoalPayload {
    title?: string;
    iconUrl?: string | null;
    description?: string | null;
    targetAudience?: string | null;
    supportedLanguages?: string[];
    isActive?: boolean;
}
