import bookIcon from '@/assets/images/book.svg';
import clockIcon from '@/assets/images/clock.svg';
import { Button } from '@/components/core/Button';
import styles from './current-series-card.module.css';

const courseBannerUrl = 'https://www.figma.com/api/mcp/asset/73d288a2-2f42-46fd-967e-24d51a5041fa';

interface CurrentSeriesCardProps {
  className?: string;
}

export const CurrentSeriesCard = ({ className }: CurrentSeriesCardProps) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <article className={cardClassName}>
      <img src={courseBannerUrl} alt="Khoá Tiếng Pháp Du Lịch" className={styles.cover} />

      <div className={styles.content}>
        <h2 className={styles.title}>Khoá Tiếng Pháp Du Lịch</h2>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <img src={clockIcon} alt="" className={styles.clockIcon} />
            <span>3 tiếng 36 phút</span>
          </div>

          <div className={styles.metaItem}>
            <img src={bookIcon} alt="" className={styles.bookIcon} />
            <span>8 Khoá</span>
          </div>
        </div>

        <div className={styles.progressArea}>
          <div className={styles.progressLabel}>
            <span>Tiến độ học tập</span>
            <strong>53%</strong>
          </div>

          <div className={styles.progressTrack}>
            <div className={styles.progressFill} />
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
        >
          Tiếp tục học
        </Button>
      </div>
    </article>
  );
};
