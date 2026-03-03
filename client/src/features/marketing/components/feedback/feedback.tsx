import styles from './feedback.module.css';
import starIcon from '@/assets/icons/star.svg';

interface Props {}

interface FeedbackItem {
	id: string;
	author: string;
	date: string;
	title: string;
	content: string;
}

const feedbackItems: FeedbackItem[] = [
	{
		id: '1',
		author: 'Delano Holloway',
		date: '04/16/25',
		title: 'This works!',
		content:
			'Within the first few minutes I was like hell yeah Duo can KMA this is real learning. If I did not have work in the morning I would be on it at least another 2 hours.',
	},
	{
		id: '2',
		author: 'Alan Hernández',
		date: '09/24/23',
		title: 'Excellent app',
		content:
			'It is very versatile and quite effective. If you are looking to study or review, this is an option. In addition to having a virtual tutor or a guide made and the truth is excellent.',
	},
	{
		id: '3',
		author: 'blair lee',
		date: '08/09/24',
		title: 'This is godly!!',
		content:
			'I have tried various things to live a godly life, but this app ended in three-day wonder. Speak is the precious app that broke that cycle!',
	},
	{
		id: '4',
		author: 'Bob White',
		date: '06/06/25',
		title: 'Easily the most effective Spanish app',
		content:
			'This is the only language app that does not leave me behind. It makes sure you are actually picking up the concepts. Worth every penny.',
	},
	{
		id: '5',
		author: 'User review',
		date: '07/21/23',
		title: 'Amazing!!!',
		content:
			'While other services just correct awkward sentences, I was surprised that Speak provides detailed feedback on why the expression is awkward.',
	},
	{
		id: '6',
		author: 'Patrick King',
		date: '11/10/24',
		title: 'I NEED MORE!!',
		content:
			'I hope they release it in other languages because I like it so much. It feels more confident and correct than talking to a real person!',
	},
	{
		id: '7',
		author: 'User Review',
		date: '06/04/24',
		title: 'If I knew now, what I knew then',
		content:
			'This app has the potential to be the best language learning app to date. For surpasses, Babbel and Rosetta Stone.',
	},
	{
		id: '8',
		author: 'Eugene Haight',
		date: '06/14/23',
		title: 'Real confidence',
		content:
			'I have always wanted to speak but was too scared. Now I enjoy learning and speaking because it is not overwhelming me.',
	},
];

const firstRow = feedbackItems.slice(0, 4);
const secondRow = feedbackItems.slice(4);

const Stars = () => (
	<div className={styles.stars} aria-label="5 out of 5 stars">
		{Array.from({ length: 5 }).map((_, index) => (
			<img key={`star-${index}`} src={starIcon} alt="" className={styles.starIcon} aria-hidden="true" />
		))}
	</div>
);

const Feedback = ({}: Props) => {
	return (
		<section className={styles.section} aria-label="Customer feedback">
			<div className={styles.headingWrap}>
				<h2 className={styles.title}>Millions of people<br/>love UniLish</h2>
				<div className={styles.metrics}>
					<div className={styles.metricBlock}>
						<p className={styles.metricValue}>4.8</p>
						<p className={styles.metricLabel}>Rating</p>
					</div>
					<div className={styles.metricDivider} aria-hidden="true" />
					<div className={styles.metricBlock}>
						<p className={styles.metricValue}>15M+</p>
						<p className={styles.metricLabel}>Downloads</p>
					</div>
				</div>
			</div>

			<div className={styles.wall}>
				<div className={styles.rowViewport}>
					<div className={styles.track}>
						<div className={styles.group}>
							{firstRow.map((item) => (
								<article key={item.id} className={styles.card}>
									<Stars />
									<p className={styles.author}>
										{item.author}, {item.date}
									</p>
									<h3 className={styles.cardTitle}>{item.title}</h3>
									<p className={styles.cardContent}>{item.content}</p>
								</article>
							))}
						</div>
						<div className={styles.group} aria-hidden="true">
							{firstRow.map((item) => (
								<article key={`${item.id}-clone-1`} className={styles.card}>
									<Stars />
									<p className={styles.author}>
										{item.author}, {item.date}
									</p>
									<h3 className={styles.cardTitle}>{item.title}</h3>
									<p className={styles.cardContent}>{item.content}</p>
								</article>
							))}
						</div>
					</div>
				</div>

				<div className={styles.rowViewport}>
					<div className={`${styles.track} ${styles.reverse}`}>
						<div className={styles.group}>
							{secondRow.map((item) => (
								<article key={item.id} className={styles.card}>
									<Stars />
									<p className={styles.author}>
										{item.author}, {item.date}
									</p>
									<h3 className={styles.cardTitle}>{item.title}</h3>
									<p className={styles.cardContent}>{item.content}</p>
								</article>
							))}
						</div>
						<div className={styles.group} aria-hidden="true">
							{secondRow.map((item) => (
								<article key={`${item.id}-clone-2`} className={styles.card}>
									<Stars />
									<p className={styles.author}>
										{item.author}, {item.date}
									</p>
									<h3 className={styles.cardTitle}>{item.title}</h3>
									<p className={styles.cardContent}>{item.content}</p>
								</article>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Feedback;
