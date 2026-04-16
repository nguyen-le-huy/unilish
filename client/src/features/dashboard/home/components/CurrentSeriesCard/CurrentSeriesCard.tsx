import bookIcon from '@/assets/images/book.svg';
import clockIcon from '@/assets/images/clock.svg';
import { Button } from '@/components/core/Button';
import styles from './CurrentSeriesCard.module.css';

const courseBannerUrl = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2346&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

interface CurrentSeriesCardProps {
  className?: string;
}

export const CurrentSeriesCard = ({ className }: CurrentSeriesCardProps) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <article className={cardClassName}>
      <img src={courseBannerUrl} alt="Khoá Tiếng Pháp Du Lịch" className={styles.cover} />

      <div className={styles.content}>
        <h2 className={styles.title}>Tiếng Pháp Du Lịch A2</h2>

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
