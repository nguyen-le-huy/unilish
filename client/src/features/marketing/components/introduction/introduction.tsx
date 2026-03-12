import styles from './introduction.module.css';
import introductionVideo1 from '@/assets/videos/introduction-1.mp4';
import introductionVideo2 from '@/assets/videos/introduction-2.mp4';

interface Props {}

const Introduction = ({}: Props) => {
	return (
		<section className={styles.section} aria-label="Giới thiệu phương pháp học">
			<div className={styles.headingWrap}>
				<h2 className={styles.title}>Bạn cần nói thành tiếng để<br/>học một ngôn ngữ.</h2>
				<p className={styles.subtitle}>
					Triết lý cốt lõi của UniLish là giúp bạn luyện nói thành tiếng nhiều nhất có thể.
				</p>
			</div>

			<div className={styles.cards}>
						<video
							src={introductionVideo1}
							className={styles.video}
							autoPlay
							loop
							muted
							playsInline
						/>
						<video
							src={introductionVideo2}
							className={styles.video}
							autoPlay
							loop
							muted
							playsInline
						/>
			</div>
		</section>
	);
};

export default Introduction;
