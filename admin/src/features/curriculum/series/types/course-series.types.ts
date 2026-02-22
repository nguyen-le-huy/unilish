// Re-export sibling types via public barrel (FSD cross-feature import rule)
export type { Language } from '@/features/curriculum/languages';
export type { LearningGoal } from '@/features/curriculum/goals';

// ─── Core entity ─────────────────────────────────────────────────────────────

export interface CourseSeries {
    _id: string;
    slug: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    totalCourses: number;
    isActive: boolean;
    /** Populated in detail/list responses with basic language info. */
    languageId: string | import('@/features/curriculum/languages').Language;
    /** Populated in detail/list responses with basic goal info. */
    learningGoalId: string | import('@/features/curriculum/goals').LearningGoal;
    createdAt: string;
    updatedAt: string;
}

// ─── API response envelopes ───────────────────────────────────────────────────

export interface CourseSeriesListResponse {
    data: CourseSeries[];
    meta: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ─── Query params ─────────────────────────────────────────────────────────────

export interface CourseSeriesListQuery {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    languageId?: string;
    learningGoalId?: string;
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface CreateCourseSeriesPayload {
    slug: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    languageId: string;
    learningGoalId: string;
    isActive: boolean;
}

export interface UpdateCourseSeriesPayload {
    title?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    isActive?: boolean;
}
