// ─── Enrollment ───────────────────────────────────────────────────────────────

export interface EnrollmentDto {
    enrollmentId: string;
    courseId: string;
    courseSlug?: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    nextLessonId?: string | null;
    completedLessonCount?: number;
    totalRequiredLessonCount?: number;
    timeSpentSeconds?: number;
    startedAt?: string;
    completedAt?: string | null;
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

// ─── Exercise / Objective Question DTOs ──────────────────────────────────────

export interface LearnerStem {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
}

export type LearnerPracticeQuestionDto =
    | {
          id: string;
          version: number;
          type: 'MULTIPLE_CHOICE';
          stem: LearnerStem;
          options: Array<{ id: string; text: string }>;
      }
    | {
          id: string;
          version: number;
          type: 'FILL_IN_BLANK';
          stem: LearnerStem;
      }
    | {
          id: string;
          version: number;
          type: 'TRUE_FALSE';
          stem: LearnerStem;
      }
    | {
          id: string;
          version: number;
          type: 'MATCHING';
          stem: LearnerStem;
          items: Array<{ id: string; text: string }>;
          targets: Array<{ id: string; text: string }>;
      }
    | {
          id: string;
          version: number;
          type: 'ERROR_CORRECTION';
          stem: LearnerStem & { text: string };
      };

export type LearnerExerciseDto =
    | {
          kind: 'OBJECTIVE';
          mode: 'FIXED';
          passingScore: number;
          questions: LearnerPracticeQuestionDto[];
      }
    | { kind: 'SPEAKING'; sessionRequired: true }
    | { kind: 'WRITING'; minWords: number; maxWords: number }
    | { kind: 'COMPLETION' };

// ─── Answer / Submission / Checkpoint DTOs ────────────────────────────────────

export type ObjectiveAnswer =
    | {
          questionId: string;
          questionVersion: number;
          type: 'MULTIPLE_CHOICE';
          answer: { selectedOptionId: string };
      }
    | {
          questionId: string;
          questionVersion: number;
          type: 'FILL_IN_BLANK';
          answer: { text: string };
      }
    | {
          questionId: string;
          questionVersion: number;
          type: 'TRUE_FALSE';
          answer: { value: boolean };
      }
    | {
          questionId: string;
          questionVersion: number;
          type: 'MATCHING';
          answer: { pairs: Record<string, string> };
      }
    | {
          questionId: string;
          questionVersion: number;
          type: 'ERROR_CORRECTION';
          answer: { text: string };
      };

export type LessonSubmissionKind =
    | { kind: 'OBJECTIVE'; answers: ObjectiveAnswer[] }
    | { kind: 'SPEAKING'; sessionId: string }
    | { kind: 'WRITING'; text: string; warmupAnswers?: Record<string, string> }
    | { kind: 'COMPLETION'; acknowledged: true };

export type ExerciseCheckpointKind =
    | { kind: 'OBJECTIVE'; answers: ObjectiveAnswer[]; currentQuestionIndex: number }
    | { kind: 'WRITING'; text: string; warmupAnswers: Record<string, string> }
    | { kind: 'SPEAKING'; sessionId: string | null }
    | { kind: 'COMPLETION'; acknowledged: boolean };

// ─── Lesson DTO ───────────────────────────────────────────────────────────────

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
        exercise: LearnerExerciseDto;
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

// ─── Lesson Submission Result ─────────────────────────────────────────────────

export interface LessonQuestionFeedback {
    questionId: string;
    correct: boolean;
    learnerAnswer: unknown;
    correctAnswer: unknown;
    explanation: string | null;
}

export interface LessonSubmissionResult {
    attemptId: string;
    score: number | null;
    passed: boolean;
    latestScore: number | null;
    bestScore: number | null;
    feedback: {
        summary: string | null;
        questions: LessonQuestionFeedback[];
    } | null;
    progress: {
        lessonStatus: 'IN_PROGRESS' | 'COMPLETED';
        unitStatus: LearningStatus;
        courseStatus: 'ACTIVE' | 'COMPLETED';
        courseProgressPercent: number;
    };
    nextLessonId: string | null;
}
