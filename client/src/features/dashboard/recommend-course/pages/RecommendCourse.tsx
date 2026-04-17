import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import CourseCard from '@/components/core/CourseCard/CourseCard';
import { PATHS } from '@/config/paths';
import { queryClient } from '@/lib/react-query';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiErrorResponse } from '@/types/common';
import { useJoinRecommendedCourseMutation } from '../hooks/use-join-recommended-course-mutation';
import { useRecommendationsQuery } from '../hooks/use-recommendations-query';
import styles from './RecommendCourse.module.css';

const SKELETON_CARD_COUNT = 4;

const RecommendCourse = () => {
    const navigate = useNavigate();
    const [joiningSeriesId, setJoiningSeriesId] = useState<string | null>(null);
    const currentLevel = useAuthStore((state) => state.user?.currentLevel);
    const user = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);
    const { data, isLoading, isError } = useRecommendationsQuery();
    const { mutate: joinRecommendedCourse, isPending: isJoining } = useJoinRecommendedCourseMutation();

    const recommendations = data ?? [];
    const shouldShowOnboardingMessage = !currentLevel || currentLevel === 'A0';
    const shouldShowEmpty = !isLoading && !isError && recommendations.length === 0;

    const handleJoinSeries = useCallback((seriesId: string) => {
        if (isJoining) {
            return;
        }

        setJoiningSeriesId(seriesId);

        joinRecommendedCourse(seriesId, {
            onSuccess: (updatedUser) => {
                const nextUser = user
                    ? {
                        ...user,
                        ...updatedUser,
                        lastActiveCourseId: updatedUser.lastActiveCourseId ?? seriesId,
                    }
                    : {
                        ...updatedUser,
                        lastActiveCourseId: updatedUser.lastActiveCourseId ?? seriesId,
                    };

                setUser(nextUser);
                queryClient.setQueryData(['auth', 'me'], nextUser);
                toast.success('Đã tham gia khóa học thành công');
                navigate(PATHS.DASHBOARD.HOME, { replace: true });
            },
            onError: (error: AxiosError<ApiErrorResponse>) => {
                const message = error.response?.data?.message ?? 'Không thể tham gia khóa học. Vui lòng thử lại.';
                toast.error(message);
            },
            onSettled: () => {
                setJoiningSeriesId(null);
            },
        });
    }, [isJoining, joinRecommendedCourse, navigate, setUser, user]);

    return (
        <section className={styles.recommendCourse}>
            <div className={styles.header}>
                <h1 className={styles.title}>KHOÁ HỌC ĐỀ XUẤT</h1>
                <p className={styles.description}>Khám phá các khoá học được thiết kế riêng cho bạn</p>
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
                    <p className={[styles.stateMessage, styles.errorMessage].join(' ')}>
                        Không thể tải khoá học đề xuất. Vui lòng thử lại sau.
                    </p>
                </div>
            )}

            {!isLoading && !isError && shouldShowEmpty && (
                <div className={styles.stateWrapper}>
                    <p className={styles.stateMessage}>
                        {shouldShowOnboardingMessage
                            ? 'Hoàn thành bài kiểm tra để nhận đề xuất khoá học phù hợp.'
                            : 'Hiện chưa có khoá học phù hợp với hồ sơ của bạn.'}
                    </p>
                </div>
            )}

            {!isLoading && !isError && recommendations.length > 0 && (
                <div className={styles.courseGrid}>
                    {recommendations.map((series) => (
                        <CourseCard
                            key={series.id}
                            title={series.title}
                            description={series.description}
                            imageUrl={series.thumbnailUrl}
                            badge={[series.levelMin, series.levelMax].join(' → ')}
                            totalCourses={series.totalCourses}
                            onJoin={() => handleJoinSeries(series.id)}
                            joinLabel={isJoining && joiningSeriesId === series.id ? 'Đang tham gia...' : 'Tham gia'}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default RecommendCourse;