// ─── Queries ──────────────────────────────────────────────────────────────────
export { useCoursesBySeriesId, useCourseDetail, useCourseTree } from './hooks/useCourses';

// ─── Course Mutations ─────────────────────────────────────────────────────────
export {
    useCreateCourse,
    useUpdateCourse,
    useToggleCourseStatus,
    useDeleteCourse,
} from './hooks/useCourseMutations';

// ─── Unit Mutations ───────────────────────────────────────────────────────────
export {
    useCreateUnit,
    useUpdateUnit,
    useDeleteUnit,
    useReorderUnits,
} from './hooks/useUnitMutations';

// ─── Lesson Mutations ─────────────────────────────────────────────────────────
export {
    useCreateLesson,
    useUpdateLesson,
    useDeleteLesson,
    useReorderLessons,
} from './hooks/useLessonMutations';

// ─── Store ────────────────────────────────────────────────────────────────────
export { useCourseStudioStore } from './stores/course-studio.store';
export type { StudioNodeType, SelectedNode } from './stores/course-studio.store';

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
    Course,
    Unit,
    LessonSummary,
    UnitWithLessons,
    CourseTreeDTO,
    CEFRLevel,
    LessonType,
    PracticeMode,
    CreateCoursePayload,
    UpdateCoursePayload,
    CreateUnitPayload,
    UpdateUnitPayload,
    CreateLessonPayload,
    UpdateLessonPayload,
    VocabItem,
    VocabContent,
    VocabGenerationStatus,
    VocabStatusResponse,
    GenerateVocabPayload,
    SaveVocabContentPayload,
    RegenerateAudioPayload,
} from './types/course.types';

export { CEFR_LEVELS, LESSON_TYPES, PRACTICE_MODES } from './types/course.types';
