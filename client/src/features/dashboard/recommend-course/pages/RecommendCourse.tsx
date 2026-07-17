import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import CourseCard from '@/components/core/CourseCard/CourseCard';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiErrorResponse } from '@/types/common';
import { useRecommendationsQuery } from '../hooks/use-recommendations-query';
import { useEnrollCourse } from '../../learning/hooks/use-enroll-course';
import styles from './RecommendCourse.module.css';

const SKELETON_CARD_COUNT = 4;

const RecommendCourse = () => {
    const navigate = useNavigate();
    const [joiningCourseId, setJoiningCourseId] = useState<string | null>(null);
    const currentLevel = useAuthStore((state) => state.user?.currentLevel);
    const placementTestScore = useAuthStore((state) => state.user?.placementTestScore);
    const weakSkills = useAuthStore((state) => state.user?.weakSkills);
    const { data, isLoading, isError } = useRecommendationsQuery();
    const { mutate: enrollCourse, isPending: isEnrolling } = useEnrollCourse();

    const recommendations = data ?? [];
    const hasPlacementResult = typeof placementTestScore === 'number' && placementTestScore > 0
        || Boolean(weakSkills?.length);
    const shouldShowOnboardingMessage = !currentLevel || (currentLevel === 'A0' && !hasPlacementResult);
    const shouldShowEmpty = !isLoading && !isError && recommendations.length === 0;

    const handleJoinCourse = useCallback((courseId: string, slug: string) => {
        if (isEnrolling) {
            return;
        }

        setJoiningCourseId(courseId);

        enrollCourse(courseId, {
            onSuccess: () => {
                toast.success('Đã tham gia khóa học thành công');
                navigate(PATHS.COURSE_DETAIL(slug), { replace: true });
            },
            onError: (error: AxiosError<ApiErrorResponse>) => {
                const message = error.response?.data?.message ?? 'Không thể tham gia khóa học. Vui lòng thử lại.';
                toast.error(message);
            },
            onSettled: () => {
                setJoiningCourseId(null);
            },
        });
    }, [isEnrolling, enrollCourse, navigate]);

    return (
        <section className={styles.recommendCourse}>
            <div className={styles.header}>
                <div className={styles.headingCopy}>
                    <span className={styles.eyebrow}>Lộ trình dành riêng cho bạn</span>
                    <h1 className={styles.title}>Khóa học đề xuất</h1>
                    <p className={styles.description}>
                        Những khóa học phù hợp với trình độ và mục tiêu của bạn, được chọn lọc để bạn tiến bộ nhanh hơn.
                    </p>
                </div>

                {!isLoading && !isError && recommendations.length > 0 && (
                    <div className={styles.summary} aria-label="Tóm tắt đề xuất">
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryValue}>{recommendations.length}</span>
                            <span className={styles.summaryLabel}>Khóa học phù hợp</span>
                        </div>
                        <span className={styles.summaryDivider} aria-hidden="true" />
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryValue}>{currentLevel || '—'}</span>
                            <span className={styles.summaryLabel}>Trình độ hiện tại</span>
                        </div>
                    </div>
                )}
            </div>

            {isLoading && (
                <div className={styles.courseGrid}>
                    {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                        <div key={'recommend-skeleton-' + index} className={styles.skeletonCard} />
                    ))}
                </div>
            )}

            {isError && (
                <div className={styles.stateWrapper}>
                    <span className={styles.stateIcon} aria-hidden="true">!</span>
                    <p className={[styles.stateMessage, styles.errorMessage].join(' ')}>
                        Không thể tải khoá học đề xuất. Vui lòng thử lại sau.
                    </p>
                </div>
            )}

            {!isLoading && !isError && shouldShowEmpty && (
                <div className={styles.stateWrapper}>
                    <span className={styles.stateIcon} aria-hidden="true">✦</span>
                    <p className={styles.stateMessage}>
                        {shouldShowOnboardingMessage
                            ? 'Hoàn thành bài kiểm tra để nhận đề xuất khoá học phù hợp.'
                            : 'Hiện chưa có khoá học phù hợp với hồ sơ của bạn.'}
                    </p>
                </div>
            )}

            {!isLoading && !isError && recommendations.length > 0 && (
                <div className={styles.courseGrid}>
                    {recommendations.map((course) => (
                        <CourseCard
                            key={course.id}
                            title={course.title}
                            description={course.description}
                            imageUrl={course.thumbnailUrl}
                            badge={course.level}
                            totalUnits={course.totalUnits}
                            onJoin={() => handleJoinCourse(course.id, course.slug)}
                            joinLabel={isEnrolling && joiningCourseId === course.id ? 'Đang tham gia...' : 'Tham gia'}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default RecommendCourse;
