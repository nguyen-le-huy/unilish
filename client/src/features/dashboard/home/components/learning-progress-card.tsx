import arrowDownIcon from '@/assets/images/arrow-down.svg';
import bookIcon from '@/assets/images/book.svg';
import clockIcon from '@/assets/images/clock.svg';
import tickIcon from '@/assets/images/tick.svg';
import { Button } from '@/components/core/Button';
import styles from './learning-progress-card.module.css';

interface LearningProgressCardProps {
  className?: string;
}

export const LearningProgressCard = ({ className }: LearningProgressCardProps) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <article className={cardClassName}>
      <header className={styles.header}>
        <h2 className={styles.title}>Tiến độ</h2>
        <Button
          type="button"
          variant="ghost"
          padding="B"
          fontSize={18}
          rightIcon={arrowDownIcon}
          iconWidth={15}
          textColor="black"
          className={styles.periodButton}
        >
          Tháng
        </Button>
      </header>

      <ul className={styles.statsList}>
        <li className={styles.statItem}>
          <img src={clockIcon} alt="" className={styles.clockIcon} />
          <span>8 tiếng</span>
        </li>

        <li className={styles.statItem}>
          <img src={tickIcon} alt="" className={styles.tickIcon} />
          <span>8 khoá đã hoàn thành</span>
        </li>

        <li className={styles.statItem}>
          <img src={bookIcon} alt="" className={styles.bookIcon} />
          <span>2 khoá đang tham gia</span>
        </li>
      </ul>
    </article>
  );
};
