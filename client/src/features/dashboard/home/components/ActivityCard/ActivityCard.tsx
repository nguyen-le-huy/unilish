import styles from './ActivityCard.module.css';
import sickMascotUrl from '@/assets/images/sick.svg';

type DotState = 'active' | 'inactive' | 'muted';

const activityRows: DotState[][] = [
  Array.from({ length: 12 }, () => 'active'),
  ['inactive', 'inactive', 'inactive', 'inactive', 'inactive', 'muted', 'inactive', 'inactive', 'inactive', 'inactive', 'inactive', 'inactive'],
  Array.from({ length: 5 }, () => 'inactive'),
];

interface ActivityCardProps {
  className?: string;
}

export const ActivityCard = ({ className }: ActivityCardProps) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <article className={cardClassName}>
      <div className={styles.content}>
        <h2 className={styles.title}>Hoạt động của bạn</h2>

        <div className={styles.summary}>
          <p className={styles.days}>
            <span className={styles.daysValue}>27</span>
            <span className={styles.daysLabel}>Ngày</span>
          </p>
          <p className={styles.time}>3 tiếng 36 phút</p>
        </div>

        <div className={styles.monthArea}>
          <p className={styles.monthLabel}>Tháng 4</p>

          <div className={styles.dotRows}>
            {activityRows.map((row, rowIndex) => (
              <div className={styles.dotRow} key={`row-${rowIndex}`}>
                {row.map((dotState, columnIndex) => {
                  const dotClassName =
                    dotState === 'active'
                      ? `${styles.dot} ${styles.dotActive}`
                      : dotState === 'muted'
                        ? `${styles.dot} ${styles.dotMuted}`
                        : styles.dot;
                  return (
                    <span
                      key={`dot-${rowIndex}-${columnIndex}`}
                      className={dotClassName}
                      aria-hidden="true"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <img src={sickMascotUrl} alt="" className={styles.mascotImage} aria-hidden="true" />
    </article>
  );
};