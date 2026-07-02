// Pages
export { default as CourseOverviewPage } from './pages/CourseOverviewPage/CourseOverviewPage';
export { default as LessonPlayerPage } from './pages/LessonPlayerPage/LessonPlayerPage';

// Hooks
export { useEnrollCourse } from './hooks/use-enroll-course';
export { useCourseRoadmap } from './hooks/use-course-roadmap';
export { useEnrollments } from './hooks/use-enrollments';
export { useDashboard } from './hooks/use-dashboard';
export { useLesson, useStartLesson, useSaveCheckpoint, useSubmitLesson } from './hooks/use-lesson';

// Types
export type {
    EnrollmentDto,
    EnrollmentsListResponse,
    CourseRoadmapDto,
    LearnerLessonDto,
    LearningDashboardDto,
    LearningStatus,
    LessonType,
} from './types/learning.types';

export { LESSON_TYPES } from './types/learning.types';
