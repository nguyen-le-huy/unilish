import { useCallback, useDeferredValue, useState } from 'react';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CourseCard from '@/components/core/CourseCard/CourseCard';
import { PATHS } from '@/config/paths';
import type { ApiErrorResponse } from '@/types/common';
import { useEnrollCourse } from '../../learning/hooks/use-enroll-course';
import { useAllCourses } from '../hooks/use-all-courses';
import type { CourseCatalogItem } from '../types/all-courses.types';
import styles from './AllCoursesPage.module.css';

const LEVELS: Array<CourseCatalogItem['level']> = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const AllCoursesPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState<CourseCatalogItem['level'] | ''>('');
    const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);
    const { data: courses = [], isLoading, isError } = useAllCourses({
        ...(deferredSearch.trim() ? { search: deferredSearch } : {}),
        ...(level ? { level } : {}),
    });
    const { mutate: enrollCourse, isPending: isEnrolling } = useEnrollCourse();

    const handleJoin = useCallback((course: CourseCatalogItem) => {
        if (isEnrolling) return;
        const courseId = course.id ?? course._id;
        setJoiningCourseId(courseId);
        enrollCourse(courseId, {
            onSuccess: () => {
                toast.success('Đã chọn khóa học thành công');
                navigate(PATHS.COURSE_DETAIL(course.slug));
            },
            onError: (error: AxiosError<ApiErrorResponse>) => {
                toast.error(error.response?.data?.message ?? 'Không thể tham gia khóa học.');
            },
            onSettled: () => setJoiningCourseId(null),
        });
    }, [enrollCourse, isEnrolling, navigate]);

    return (
        <section className={styles.page}>
            <header className={styles.header}>
                <h1>Tất cả khóa học</h1>
                <p>Tự chọn khóa học phù hợp với mục tiêu và trình độ của bạn.</p>
            </header>

            <div className={styles.filters}>
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm kiếm khóa học"
                    aria-label="Tìm kiếm khóa học"
                />
                <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value as CourseCatalogItem['level'] | '')}
                    aria-label="Lọc theo trình độ"
                >
                    <option value="">Tất cả trình độ</option>
                    {LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>

            {isLoading && <p className={styles.state}>Đang tải khóa học...</p>}
            {isError && <p className={styles.error}>Không thể tải danh sách khóa học.</p>}
            {!isLoading && !isError && courses.length === 0 && (
                <p className={styles.state}>Không tìm thấy khóa học phù hợp.</p>
            )}

            {!isLoading && !isError && courses.length > 0 && (
                <div className={styles.grid}>
                    {courses.map((course) => {
                        const courseId = course.id ?? course._id;
                        return (
                            <CourseCard
                                key={courseId}
                                title={course.name}
                                description={course.description ?? 'Khám phá nội dung và bắt đầu học ngay.'}
                                {...(course.thumbnailUrl ? { imageUrl: course.thumbnailUrl } : {})}
                                badge={course.level}
                                totalUnits={course.totalUnits}
                                onJoin={() => handleJoin(course)}
                                joinLabel={isEnrolling && joiningCourseId === courseId ? 'Đang tham gia...' : 'Tham gia'}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default AllCoursesPage;
