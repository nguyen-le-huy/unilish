import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CourseCard from '@/components/core/CourseCard/CourseCard';
import { PATHS } from '@/config/paths';
import type { ApiErrorResponse } from '@/types/common';
import { useLanguagesQuery } from '../../language-selection/hooks/use-languages-query';
import { useLearningGoalsQuery } from '../../goal-selection/hooks/use-learning-goals-query';
import { useEnrollCourse } from '../../learning/hooks/use-enroll-course';
import { useAllCourses } from '../hooks/use-all-courses';
import type { CourseCatalogItem } from '../types/all-courses.types';
import styles from './AllCoursesPage.module.css';

const LEVELS: Array<CourseCatalogItem['level']> = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const LEVEL_ORDER = Object.fromEntries(LEVELS.map((item, index) => [item, index])) as Record<CourseCatalogItem['level'], number>;

type SortOption = 'recommended' | 'name-asc' | 'level-asc' | 'units-asc' | 'units-desc';

const AllCoursesPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState<CourseCatalogItem['level'] | ''>('');
    const [languageId, setLanguageId] = useState('');
    const [learningGoalId, setLearningGoalId] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recommended');
    const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);
    const { data: courses = [], isLoading, isError } = useAllCourses({
        ...(deferredSearch.trim() ? { search: deferredSearch } : {}),
        ...(level ? { level } : {}),
        ...(languageId ? { languageId } : {}),
        ...(learningGoalId ? { learningGoalId } : {}),
    });
    const { data: languages = [], isLoading: isLoadingLanguages } = useLanguagesQuery();
    const { data: goals = [], isLoading: isLoadingGoals } = useLearningGoalsQuery(languageId || undefined);
    const { mutate: enrollCourse, isPending: isEnrolling } = useEnrollCourse();

    const availableGoals = useMemo(() => {
        if (!languageId) return goals;
        return goals.filter((goal) => (
            !goal.supportedLanguages?.length || goal.supportedLanguages.includes(languageId)
        ));
    }, [goals, languageId]);

    const visibleCourses = useMemo(() => {
        if (sortBy === 'recommended') return courses;

        return [...courses].sort((first, second) => {
            if (sortBy === 'name-asc') return first.name.localeCompare(second.name, 'vi');
            if (sortBy === 'level-asc') return LEVEL_ORDER[first.level] - LEVEL_ORDER[second.level];
            if (sortBy === 'units-asc') return first.totalUnits - second.totalUnits;
            return second.totalUnits - first.totalUnits;
        });
    }, [courses, sortBy]);

    const activeFilterCount = [search.trim(), languageId, learningGoalId, level].filter(Boolean).length;

    const resetFilters = () => {
        setSearch('');
        setLevel('');
        setLanguageId('');
        setLearningGoalId('');
        setSortBy('recommended');
    };

    const handleLanguageChange = (nextLanguageId: string) => {
        setLanguageId(nextLanguageId);
        setLearningGoalId('');
    };

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
                <div className={styles.headerCopy}>
                    <span className={styles.eyebrow}>Thư viện học tập</span>
                    <h1>Tất cả khóa học</h1>
                    <p>Khám phá lộ trình phù hợp với mục tiêu, trình độ và quỹ thời gian của bạn.</p>
                </div>
                <div className={styles.headerStat}>
                    <strong>{isLoading ? '—' : visibleCourses.length}</strong>
                    <span>khóa học phù hợp</span>
                </div>
            </header>

            <div className={styles.filterPanel}>
                <div className={styles.filterHeading}>
                    <div>
                        <h2>Bộ lọc khóa học</h2>
                        <p>Thu hẹp kết quả để tìm đúng lộ trình bạn cần.</p>
                    </div>
                    {activeFilterCount > 0 && (
                        <button type="button" className={styles.resetButton} onClick={resetFilters}>
                            Xóa bộ lọc <span>{activeFilterCount}</span>
                        </button>
                    )}
                </div>

                <div className={styles.filters}>
                    <label className={`${styles.field} ${styles.searchField}`}>
                        <span className={styles.fieldLabel}>Tìm kiếm</span>
                        <span className={styles.controlWrap}>
                            <svg className={styles.controlIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                                <path d="m12.75 12.75 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tên hoặc nội dung khóa học"
                            />
                        </span>
                    </label>

                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Ngôn ngữ</span>
                        <select
                            value={languageId}
                            disabled={isLoadingLanguages}
                            onChange={(event) => handleLanguageChange(event.target.value)}
                        >
                            <option value="">Tất cả ngôn ngữ</option>
                            {languages.map((language) => (
                                <option key={language._id} value={language._id}>{language.name}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Mục tiêu học tập</span>
                        <select
                            value={learningGoalId}
                            disabled={isLoadingGoals}
                            onChange={(event) => setLearningGoalId(event.target.value)}
                        >
                            <option value="">Tất cả mục tiêu</option>
                            {availableGoals.map((goal) => (
                                <option key={goal._id} value={goal._id}>{goal.title}</option>
                            ))}
                        </select>
                    </label>

                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Trình độ</span>
                        <select
                            value={level}
                            onChange={(event) => setLevel(event.target.value as CourseCatalogItem['level'] | '')}
                        >
                            <option value="">Tất cả trình độ</option>
                            {LEVELS.map((item) => <option key={item} value={item}>Trình độ {item}</option>)}
                        </select>
                    </label>

                    <label className={styles.field}>
                        <span className={styles.fieldLabel}>Sắp xếp</span>
                        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                            <option value="recommended">Đề xuất cho bạn</option>
                            <option value="name-asc">Tên A–Z</option>
                            <option value="level-asc">Trình độ tăng dần</option>
                            <option value="units-asc">Ít bài học trước</option>
                            <option value="units-desc">Nhiều bài học trước</option>
                        </select>
                    </label>
                </div>
            </div>

            {!isLoading && !isError && (
                <div className={styles.resultBar}>
                    <p><strong>{visibleCourses.length}</strong> kết quả phù hợp</p>
                    {activeFilterCount > 0 && <span>Đang áp dụng {activeFilterCount} bộ lọc</span>}
                </div>
            )}

            {isLoading && (
                <div className={styles.skeletonGrid} aria-label="Đang tải khóa học">
                    {Array.from({ length: 3 }).map((_, index) => <div key={index} className={styles.skeletonCard} />)}
                </div>
            )}
            {isError && <div className={`${styles.state} ${styles.error}`}>Không thể tải danh sách khóa học.</div>}
            {!isLoading && !isError && visibleCourses.length === 0 && (
                <div className={styles.state}>
                    <span className={styles.stateIcon}>⌕</span>
                    <h3>Chưa tìm thấy khóa học phù hợp</h3>
                    <p>Hãy thử đổi từ khóa hoặc mở rộng điều kiện lọc.</p>
                    <button type="button" onClick={resetFilters}>Xóa tất cả bộ lọc</button>
                </div>
            )}

            {!isLoading && !isError && visibleCourses.length > 0 && (
                <div className={styles.grid}>
                    {visibleCourses.map((course) => {
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
