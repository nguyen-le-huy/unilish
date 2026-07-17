import { useMemo } from 'react';
import { useDashboard } from '@/features/dashboard/learning/hooks/use-dashboard';
import styles from './ActivityCard.module.css';

interface ActivityCardProps {
    className?: string;
}

const DAYS_IN_WEEK = 7;
const WEEKS_TO_SHOW = 6;

const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return '0 phút';
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

const toDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ActivityCard = ({ className }: ActivityCardProps) => {
    const today = useMemo(() => new Date(), []);
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const { data, isLoading, isError } = useDashboard(monthStr);
    const cardClassName = className ? `${styles.card} ${className}` : styles.card;

    // Build calendar-like activity dot grid for the current month.
    const { dotRows, totalActiveDays, totalMinutes } = useMemo(() => {
        const activityByDate = new Map<string, number>();
        if (data?.activityDays) {
            for (const day of data.activityDays) {
                activityByDate.set(day.date, day.minutes);
            }
        }

        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const gridStart = new Date(monthStart);
        gridStart.setDate(monthStart.getDate() - monthStart.getDay());

        const rows: { level: 'none' | 'low' | 'medium' | 'high'; outsideMonth: boolean }[][] = [];

        for (let row = 0; row < WEEKS_TO_SHOW; row++) {
            const week: { level: 'none' | 'low' | 'medium' | 'high'; outsideMonth: boolean }[] = [];
            for (let col = 0; col < DAYS_IN_WEEK; col++) {
                const dayOffset = row * DAYS_IN_WEEK + col;
                const cellDate = new Date(gridStart);
                cellDate.setDate(cellDate.getDate() + dayOffset);
                const outsideMonth = cellDate.getMonth() !== today.getMonth();
                const dateKey = toDateKey(cellDate);
                const minutes = activityByDate.get(dateKey) ?? 0;

                if (minutes >= 30) {
                    week.push({ level: 'high', outsideMonth });
                } else if (minutes > 0) {
                    week.push({ level: 'low', outsideMonth });
                } else {
                    week.push({ level: 'none', outsideMonth });
                }
            }
            rows.push(week);
        }

        const monthPrefix = monthStr;
        const activeDays = (data?.activityDays ?? []).filter((day) => day.date.startsWith(monthPrefix) && day.minutes > 0);
        const totalMins = activeDays.reduce((sum, day) => sum + day.minutes, 0);

        return { dotRows: rows, totalActiveDays: activeDays.length, totalMinutes: totalMins };
    }, [data, monthStr, today]);

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
                                        className={`${styles.dot} ${dot.outsideMonth ? styles.dotMuted : ''} ${dot.level === 'high' ? styles.dotActive : dot.level === 'low' ? styles.dotLow : ''}`}
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
