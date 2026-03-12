import styles from './rating.module.css';
import appStoreBadge from '@/assets/images/appstore.webp';
import googlePlayBadge from '@/assets/images/googleplay.webp';

const Rating = () => {
	return (
		<section className={styles.section} aria-label="Đánh giá ứng dụng và lượt tải">
			<div className={styles.panel}>
				<div className={styles.badgeBlock}>
					<img src={appStoreBadge} alt="App Store - ứng dụng nổi bật trong ngày" className={styles.badgeImage} />
				</div>

				<div className={styles.metricsBlock}>
					<div className={styles.metricItem}>
						<p className={styles.metricValue}>4.8</p>
						<p className={styles.metricLabel}>Đánh giá</p>
					</div>

					<div className={styles.metricDivider} aria-hidden="true" />

					<div className={styles.metricItem}>
						<p className={styles.metricValue}>15M+</p>
						<p className={styles.metricLabel}>Lượt tải</p>
					</div>
				</div>

				<div className={styles.badgeBlock}>
					<img src={googlePlayBadge} alt="Ứng dụng hàng đầu cho phát triển bản thân" className={styles.badgeImage} />
				</div>
			</div>

			<div className={styles.titleWrap}>
				<h2 className={styles.title}>Phương pháp UniLish đã được kiểm chứng</h2>
				<p className={styles.subtitle}>
					Tham gia cùng hàng triệu người đã thực sự học được ngoại ngữ bằng cách nói thành tiếng
				</p>
			</div>
		</section>
	);
};

export default Rating;