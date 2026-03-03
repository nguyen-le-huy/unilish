import styles from './rating.module.css';
import appStoreBadge from '@/assets/images/appstore.webp';
import googlePlayBadge from '@/assets/images/googleplay.webp';

const Rating = () => {
	return (
		<section className={styles.section} aria-label="App rating and downloads">
			<div className={styles.panel}>
				<div className={styles.badgeBlock}>
					<img src={appStoreBadge} alt="App Store app of the day" className={styles.badgeImage} />
				</div>

				<div className={styles.metricsBlock}>
					<div className={styles.metricItem}>
						<p className={styles.metricValue}>4.8</p>
						<p className={styles.metricLabel}>Rating</p>
					</div>

					<div className={styles.metricDivider} aria-hidden="true" />

					<div className={styles.metricItem}>
						<p className={styles.metricValue}>15M+</p>
						<p className={styles.metricLabel}>Downloads</p>
					</div>
				</div>

				<div className={styles.badgeBlock}>
					<img src={googlePlayBadge} alt="Top app for self-development" className={styles.badgeImage} />
				</div>
			</div>

			<div className={styles.titleWrap}>
				<h2 className={styles.title}>The Proven UniLish Method</h2>
				<p className={styles.subtitle}>
					Join the millions who have actually learned a language by speaking out loud
				</p>
			</div>
		</section>
	);
};

export default Rating;