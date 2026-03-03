import styles from './introduction.module.css';
import introductionVideo1 from '@/assets/videos/introduction-1.mp4';
import introductionVideo2 from '@/assets/videos/introduction-2.mp4';

interface Props {}

const Introduction = ({}: Props) => {
	return (
		<section className={styles.section} aria-label="Introduction to learning method">
			<div className={styles.headingWrap}>
				<h2 className={styles.title}>You need to speak a language out loud to<br/>learn it.</h2>
				<p className={styles.subtitle}>
					Speak&apos;s core philosophy is centered around getting you speaking out loud, as much
					as possible.
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
