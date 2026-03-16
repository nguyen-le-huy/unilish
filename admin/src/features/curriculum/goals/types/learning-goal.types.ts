// NOTE: Language is re-exported from the languages feature public barrel
export type { Language } from '@/features/curriculum/languages';

export type IgnoredSkill = string;

export interface SkillWeights {
    listening: number;
    speaking: number;
    reading: number;
    writing: number;
    grammar: number;
    vocabulary: number;
}

export interface LearningGoalStats {
    activeUsers: number;
}

export interface LearningGoal {
    _id: string;
    slug: string;
    title: string;
    iconUrl?: string | null;
    description?: string | null;
    targetAudience?: string | null;
    supportedLanguages: string[];
    systemPrompt: string;
    skillWeights: SkillWeights;
    ignoredSkills: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    stats?: LearningGoalStats;
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
    systemPrompt: string;
    skillWeights: SkillWeights;
    ignoredSkills: string[];
    isActive: boolean;
}

export interface UpdateLearningGoalPayload {
    title?: string;
    iconUrl?: string | null;
    description?: string | null;
    targetAudience?: string | null;
    supportedLanguages?: string[];
    systemPrompt?: string;
    skillWeights?: SkillWeights;
    ignoredSkills?: string[];
    isActive?: boolean;
}

export interface DuplicateLearningGoalPayload {
    newSlug: string;
    newTitle: string;
}

export interface TestLearningGoalPayload {
    draftConfig: {
        systemPrompt: string;
        skillWeights: SkillWeights;
        ignoredSkills: string[];
    };
    scenario: {
        userInput: string;
        context?: string;
    };
}

export interface TestLearningGoalResult {
    aiResponse: string;
    debug: {
        model: string;
        finishReason: string;
        latencyMs: number;
        tokensUsed: number;
        promptLength: number;
    };
}
