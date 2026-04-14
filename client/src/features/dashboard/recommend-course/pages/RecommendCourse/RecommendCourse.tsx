import CourseCard from '@/components/core/CourseCard/CourseCard';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useRecommendationsQuery } from '../../hooks/use-recommendations-query';
import styles from './RecommendCourse.module.css';

const SKELETON_CARD_COUNT = 4;

const RecommendCourse = () => {
    const currentLevel = useAuthStore((state) => state.user?.currentLevel);
    const { data, isLoading, isError } = useRecommendationsQuery();

    const recommendations = data ?? [];
    const shouldShowOnboardingMessage = !currentLevel || currentLevel === 'A0';
    const shouldShowEmpty = !isLoading && !isError && recommendations.length === 0;

    return (
        <section className={styles.recommendCourse}>
            <h1 className={styles.title}>KHOÁ HỌC ĐỀ XUẤT</h1>

            {isLoading && (
                <div className={styles.courseGrid}>
                    {Array.from({ length: SKELETON_CARD_COUNT }).map((_, index) => (
                        <div key={`recommend-skeleton-${index}`} className={styles.skeletonCard} />
                    ))}
                </div>
            )}

            {isError && (
                <div className={styles.stateWrapper}>
                    <p className={`${styles.stateMessage} ${styles.errorMessage}`}>
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
                            badge={`${series.levelMin} → ${series.levelMax}`}
                            totalCourses={series.totalCourses}
                            href={PATHS.SERIES(series.slug)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default RecommendCourse;
