import { useQuery } from '@tanstack/react-query';
import { getAllCourses } from '../api/get-all-courses';
import type { CourseCatalogFilters } from '../types/all-courses.types';

export const useAllCourses = (filters: CourseCatalogFilters) => useQuery({
    queryKey: ['course-catalog', filters],
    queryFn: () => getAllCourses(filters),
    staleTime: 60_000,
});
