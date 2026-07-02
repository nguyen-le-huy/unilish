// ─── Enrollment ───────────────────────────────────────────────────────────────

export interface EnrollmentDto {
    enrollmentId: string;
    courseId: string;
    courseSlug: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    nextLessonId: string | null;
}

export interface EnrollmentsListResponse {
    enrollments: EnrollmentDto[];
}

// ─── Learning Status ──────────────────────────────────────────────────────────

export type LearningStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

// ─── Course Roadmap ───────────────────────────────────────────────────────────

export interface CourseRoadmapDto {
    course: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        thumbnailUrl: string | null;
        level: string;
        language: { id: string; code: string; name: string };
        learningGoal: { id: string; slug: string; title: string };
    };
    enrollment: {
        id: string;
        status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    };
    progressPercent: number;
    nextLessonId: string | null;
    units: Array<{
        id: string;
        title: string;
        description: string | null;
        orderIndex: number;
        status: LearningStatus;
        progressPercent: number;
        lessons: Array<{
            id: string;
            title: string;
            type: LessonType;
            orderIndex: number;
            status: LearningStatus;
            bestScore: number | null;
            lockReason: string | null;
        }>;
    }>;
}

// ─── Lesson ───────────────────────────────────────────────────────────────────

export const LESSON_TYPES = [
    'VOCAB',
    'GRAMMAR',
    'READING',
    'LISTENING',
    'SPEAKING',
    'WRITING',
    'UNIT_TEST',
] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

export interface LearnerLessonDto {
    course: { id: string; slug: string; name: string };
    unit: { id: string; title: string; orderIndex: number };
    lesson: {
        id: string;
        title: string;
        type: LessonType;
        orderIndex: number;
        content: unknown;
        passingScore: number | null;
    };
    progress: {
        status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        checkpoint: unknown | null;
        checkpointVersion: number;
        bestScore: number | null;
    };
    navigation: {
        previousLessonId: string | null;
        nextLessonId: string | null;
    };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface LearningDashboardDto {
    activeCourse: {
        id: string;
        slug: string;
        name: string;
        thumbnailUrl: string | null;
        level: string;
        totalUnits: number;
        totalLessons: number;
        completedLessons: number;
        progressPercent: number;
        timeSpentSeconds: number;
        nextLessonId: string | null;
        status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    } | null;
    summary: {
        timeSpentSeconds: number;
        completedCourses: number;
        activeCourses: number;
    };
    activityDays: Array<{ date: string; minutes: number }>;
}
