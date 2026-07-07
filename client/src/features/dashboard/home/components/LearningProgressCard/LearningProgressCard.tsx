import { useDashboard } from '@/features/dashboard/learning/hooks/use-dashboard';
import styles from './LearningProgressCard.module.css';

interface LearningProgressCardProps {
    className?: string;
}

const MONTH_LABELS = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return '1 phút';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} phút`;
    if (minutes === 0) return `${hours} tiếng`;
    return `${hours} tiếng ${minutes} phút`;
};

export const LearningProgressCard = ({ className }: LearningProgressCardProps) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const { data, isLoading, isError } = useDashboard(monthStr);
    const cardClassName = className ? `${styles.card} ${className}` : styles.card;

    const summary = data?.summary;

    // Loading skeleton
    if (isLoading) {
        return (
            <article className={cardClassName}>
                <div className={styles.header}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonButton} />
                </div>
                <div className={styles.statsList}>
                    <div className={styles.skeletonStat} />
                    <div className={styles.skeletonStat} />
                    <div className={styles.skeletonStat} />
                </div>
            </article>
        );
    }

    // Error state
    if (isError) {
        return (
            <article className={cardClassName}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Tiến độ</h2>
                </div>
                <p className={styles.emptyText}>Không thể tải dữ liệu</p>
            </article>
        );
    }

    // Empty/honest zero state
    const timeDisplay = summary ? formatDuration(summary.timeSpentSeconds) : '0 phút';
    const completedDisplay = summary ? `${summary.completedCourses} khoá đã hoàn thành` : '0 khoá đã hoàn thành';
    const activeDisplay = summary ? `${summary.activeCourses} khoá đang tham gia` : '0 khoá đang tham gia';

    return (
        <article className={cardClassName}>
            <header className={styles.header}>
                <h2 className={styles.title}>Tiến độ</h2>
                <div className={styles.periodWrapper}>
                    <span className={styles.periodLabel}>{MONTH_LABELS[currentMonth]}</span>
                </div>
            </header>

            <ul className={styles.statsList}>
                <li className={styles.statItem}>
                    <span className={styles.statLabel}>Thời gian học</span>
                    <span className={styles.statValue}>{timeDisplay}</span>
                </li>
                <li className={styles.statItem}>
                    <span className={styles.statLabel}>Hoàn thành</span>
                    <span className={styles.statValue}>{completedDisplay}</span>
                </li>
                <li className={styles.statItem}>
                    <span className={styles.statLabel}>Đang tham gia</span>
                    <span className={styles.statValue}>{activeDisplay}</span>
                </li>
            </ul>
        </article>
    );
};
