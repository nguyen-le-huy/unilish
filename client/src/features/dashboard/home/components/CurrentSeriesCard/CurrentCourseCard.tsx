import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/features/dashboard/learning/hooks/use-dashboard';
import { PATHS } from '@/config/paths';
import { Button } from '@/components/core/Button';
import styles from './CurrentSeriesCard.module.css';

interface CurrentCourseCardProps {
  className?: string;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return '1 phút';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} phút`;
  if (minutes === 0) return `${hours} tiếng`;
  return `${hours} tiếng ${minutes} phút`;
};

export const CurrentCourseCard = ({ className }: CurrentCourseCardProps) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  // Loading state
  if (isLoading) {
    return (
      <article className={cardClassName}>
        <div className={styles.skeletonCover} />
        <div className={styles.content}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonMeta} />
          <div className={styles.skeletonProgress} />
          <div className={styles.skeletonButton} />
        </div>
      </article>
    );
  }

  // Error / retry state
  if (isError) {
    return (
      <article className={cardClassName}>
        <div className={styles.content}>
          <div className={styles.stateMessage}>
            <p className={styles.stateTitle}>Không thể tải thông tin</p>
            <p className={styles.stateDescription}>
              Có lỗi xảy ra khi tải khóa học hiện tại.
            </p>
            <Button
              type="button"
              variant="outline"
              size="full"
              padding="B"
              fontSize={16}
              textColor="black"
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              Thử lại
            </Button>
          </div>
        </div>
      </article>
    );
  }

  // No active course state
  if (!data?.activeCourse) {
    return (
      <article className={cardClassName}>
        <div className={styles.content}>
          <div className={styles.stateMessage}>
            <p className={styles.stateTitle}>Chưa có khóa học</p>
            <p className={styles.stateDescription}>
              Khám phá khóa học phù hợp với trình độ của bạn.
            </p>
            <Button
              type="button"
              variant="outline"
              size="full"
              padding="B"
              fontSize={16}
              textColor="black"
              className={styles.retryButton}
              onClick={() => navigate(PATHS.DASHBOARD.RECOMMEND_COURSE)}
            >
              Tìm khóa học phù hợp
            </Button>
          </div>
        </div>
      </article>
    );
  }

  const course = data.activeCourse;
  const isCompleted = course.status === 'COMPLETED';
  const isNotStarted = course.status === 'NOT_STARTED';

  // Determine CTA
  let ctaLabel: string;
  let ctaDestination: string;

  if (isCompleted) {
    ctaLabel = 'Xem lại khóa học';
    ctaDestination = PATHS.COURSE_DETAIL(course.slug);
  } else if (isNotStarted) {
    ctaLabel = 'Bắt đầu học';
    ctaDestination = course.nextLessonId
      ? PATHS.LESSON_PLAYER(course.nextLessonId)
      : PATHS.COURSE_DETAIL(course.slug);
  } else {
    ctaLabel = 'Tiếp tục học';
    ctaDestination = course.nextLessonId
      ? PATHS.LESSON_PLAYER(course.nextLessonId)
      : PATHS.COURSE_DETAIL(course.slug);
  }

  return (
    <article className={cardClassName}>
      {course.thumbnailUrl && (
        <img
          src={course.thumbnailUrl}
          alt={course.name}
          className={styles.cover}
        />
      )}
      {!course.thumbnailUrl && (
        <div className={styles.coverPlaceholder} />
      )}

      <div className={styles.content}>
        <h2 className={styles.title}>{course.name}</h2>
        <span className={styles.level}>{course.level}</span>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <span>{course.totalLessons} bài học</span>
          </div>
          <div className={styles.metaItem}>
            <span>{formatDuration(course.timeSpentSeconds)}</span>
          </div>
        </div>

        <div className={styles.progressArea}>
          <div className={styles.progressLabel}>
            <span>Tiến độ học tập</span>
            <strong>{course.progressPercent}%</strong>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="full"
          padding="B"
          fontSize={18}
          textColor="black"
          className={styles.continueButton}
          onClick={() => navigate(ctaDestination)}
        >
          {ctaLabel}
        </Button>
      </div>
    </article>
  );
};
