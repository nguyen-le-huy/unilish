// Public barrel — only import from this file when crossing feature boundaries (FSD §2)
export { default as SeriesListPage } from './pages/SeriesListPage/SeriesListPage';
export { default as SeriesEditorPage } from './pages/SeriesEditorPage/SeriesEditorPage';
export { useSeriesList, useSeriesDetail } from './hooks/useCourseSeries';
export type { CourseSeries, CourseSeriesListQuery, CreateCourseSeriesPayload, UpdateCourseSeriesPayload } from './types/course-series.types';
