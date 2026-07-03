import { useMemo } from 'react';
import { useDashboard } from '@/features/dashboard/learning/hooks/use-dashboard';
import styles from './ActivityCard.module.css';

interface ActivityCardProps {
    className?: string;
}

const DAYS_IN_WEEK = 7;
const WEEKS_TO_SHOW = 5;

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return '1 phút';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} phút`;
    if (minutes === 0) return `${hours} tiếng`;
    return `${hours} tiếng ${minutes} phút`;
};

const getMonthName = (date: Date): string => {
    return `Tháng ${date.getMonth() + 1}`;
};

export const ActivityCard = ({ className }: ActivityCardProps) => {
    const today = useMemo(() => new Date(), []);
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const { data, isLoading, isError } = useDashboard(monthStr);
    const cardClassName = className ? `${styles.card} ${className}` : styles.card;

    // Build activity dot grid from API data
    const { dotRows, totalActiveDays, totalMinutes } = useMemo(() => {
        const activityByDate = new Map<string, number>();
        if (data?.activityDays) {
            for (const day of data.activityDays) {
                activityByDate.set(day.date, day.minutes);
            }
        }

        // Build grid: WEEKS_TO_SHOW rows × DAYS_IN_WEEK cols
        // Align to end of current week (today)
        const endOfWeek = new Date(today);
        endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

        const rows: { level: 'none' | 'low' | 'medium' | 'high' }[][] = [];
        let activeDays = 0;
        let totalMins = 0;

        for (let row = 0; row < WEEKS_TO_SHOW; row++) {
            const week: { level: 'none' | 'low' | 'medium' | 'high' }[] = [];
            for (let col = 0; col < DAYS_IN_WEEK; col++) {
                const dayOffset = (row * DAYS_IN_WEEK + col) - (WEEKS_TO_SHOW * DAYS_IN_WEEK - 1);
                const cellDate = new Date(endOfWeek);
                cellDate.setDate(cellDate.getDate() + dayOffset);
                const dateKey = cellDate.toISOString().split('T')[0];
                const minutes = activityByDate.get(dateKey) ?? 0;

                if (minutes >= 30) {
                    week.push({ level: 'high' });
                    activeDays++;
                } else if (minutes > 0) {
                    week.push({ level: 'low' });
                    activeDays++;
                } else {
                    week.push({ level: 'none' });
                }
                totalMins += minutes;
            }
            rows.push(week);
        }

        return { dotRows: rows, totalActiveDays: activeDays, totalMinutes: totalMins };
    }, [data, today]);

    // Loading skeleton
    if (isLoading) {
        return (
            <article className={cardClassName}>
                <div className={styles.content}>
                    <div className={styles.skeletonTitle} />
                    <div className={styles.skeletonSummary} />
                    <div className={styles.skeletonDots} />
                </div>
            </article>
        );
    }

    // Error state
    if (isError) {
        return (
            <article className={cardClassName}>
                <div className={styles.content}>
                    <h2 className={styles.title}>Hoạt động của bạn</h2>
                    <p className={styles.emptyText}>Không thể tải dữ liệu</p>
                </div>
            </article>
        );
    }

    return (
        <article className={cardClassName}>
            <div className={styles.content}>
                <h2 className={styles.title}>Hoạt động của bạn</h2>

                <div className={styles.summary}>
                    <p className={styles.days}>
                        <span className={styles.daysValue}>{totalActiveDays}</span>
                        <span className={styles.daysLabel}>Ngày</span>
                    </p>
                    <p className={styles.time}>{formatDuration(totalMinutes * 60)} học tập</p>
                </div>

                <div className={styles.monthArea}>
                    <p className={styles.monthLabel}>{getMonthName(today)}</p>

                    <div className={styles.dotRows}>
                        {dotRows.map((row, rowIndex) => (
                            <div className={styles.dotRow} key={`row-${rowIndex}`}>
                                {row.map((dot, colIndex) => (
                                    <span
                                        key={`dot-${rowIndex}-${colIndex}`}
                                        className={`${styles.dot} ${dot.level === 'high' ? styles.dotActive : dot.level === 'low' ? styles.dotLow : ''}`}
                                        aria-hidden="true"
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </article>
    );
};
