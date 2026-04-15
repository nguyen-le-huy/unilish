import happyImage from '@/assets/images/happy.svg';
import thunderIcon from '@/assets/icons/thunder.svg';
import { Button } from '@/components/core/Button';
import styles from './upgrade-card.module.css';

interface UpgradeCardProps {
  className?: string;
}

export const UpgradeCard = ({ className }: UpgradeCardProps) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <article className={cardClassName}>
      <div className={styles.content}>
        <div className={styles.textBlock}>
          <h2 className={styles.title}>Truy cập toàn bộ tính năng của Unilish</h2>
          <p className={styles.description}>
            Sẵn sàng nâng cấp hành trình học ngoại ngữ của bạn! Đăng ký Premium để mở khóa tất cả bài học, luyện tập không
            giới hạn và trải nghiệm các công cụ học tập thông minh giúp bạn tiến bộ nhanh hơn mỗi ngày. Học cùng Unilish –
            hiệu quả, linh hoạt và đầy cảm hứng.
          </p>
        </div>

        <Button variant="outline" leftIcon={thunderIcon} padding="B" iconWidth={20} className={styles.upgradeButton}>
          Upgrade to Pro
        </Button>
      </div>

      <div className={styles.happyWrap} aria-hidden="true">
        <img src={happyImage} alt="Happy mascot" className={styles.happyImage} />
      </div>
    </article>
  );
};
