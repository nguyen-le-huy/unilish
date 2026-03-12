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
		title: 'Ứng dụng này hiệu quả thật!',
		content:
			'Chỉ trong vài phút đầu tiên, tôi đã thấy đây mới là học thật sự. Nếu sáng mai không phải đi làm, chắc tôi đã học thêm ít nhất 2 tiếng nữa.',
	},
	{
		id: '2',
		author: 'Alan Hernández',
		date: '09/24/23',
		title: 'Ứng dụng tuyệt vời',
		content:
			'Ứng dụng rất linh hoạt và thực sự hiệu quả. Nếu bạn muốn học mới hoặc ôn lại kiến thức, đây là lựa chọn rất đáng thử. Có gia sư ảo hướng dẫn nên học cực kỳ vào.',
	},
	{
		id: '3',
		author: 'blair lee',
		date: '08/09/24',
		title: 'Đỉnh thật sự!!',
		content:
			'Tôi đã thử nhiều cách học trước đây nhưng chỉ hứng thú được vài ngày. UniLish là ứng dụng hiếm hoi giúp tôi phá vỡ vòng lặp đó và duy trì việc học đều đặn!',
	},
	{
		id: '4',
		author: 'Bob White',
		date: '06/06/25',
		title: 'Ứng dụng học tiếng Tây Ban Nha hiệu quả nhất',
		content:
			'Đây là ứng dụng học ngôn ngữ duy nhất không để tôi bị hụt lại. Nó đảm bảo bạn thực sự nắm được kiến thức, rất đáng tiền.',
	},
	{
		id: '5',
		author: 'Đánh giá người dùng',
		date: '07/21/23',
		title: 'Tuyệt vời!!!',
		content:
			'Trong khi nhiều ứng dụng chỉ sửa câu, UniLish còn giải thích chi tiết vì sao cách diễn đạt chưa tự nhiên. Tôi thật sự bất ngờ.',
	},
	{
		id: '6',
		author: 'Patrick King',
		date: '11/10/24',
		title: 'TÔI MUỐN THÊM NỮA!!',
		content:
			'Tôi mong ứng dụng sớm ra mắt thêm nhiều ngôn ngữ vì tôi thích nó quá. Luyện nói ở đây cho cảm giác tự tin và chuẩn hơn cả khi nói chuyện với người thật!',
	},
	{
		id: '7',
		author: 'Đánh giá người dùng',
		date: '06/04/24',
		title: 'Giá mà tôi biết sớm hơn',
		content:
			'Ứng dụng này có tiềm năng trở thành ứng dụng học ngôn ngữ tốt nhất hiện nay. Theo tôi, nó còn vượt cả Babbel và Rosetta Stone.',
	},
	{
		id: '8',
		author: 'Eugene Haight',
		date: '06/14/23',
		title: 'Tự tin thật sự',
		content:
			'Tôi luôn muốn nói nhưng từng rất sợ sai. Bây giờ tôi thấy thích học và thích nói hơn vì mọi thứ dễ tiếp cận, không còn quá áp lực.',
	},
];

const firstRow = feedbackItems.slice(0, 4);
const secondRow = feedbackItems.slice(4);

const Stars = () => (
	<div className={styles.stars} aria-label="5 trên 5 sao">
		{Array.from({ length: 5 }).map((_, index) => (
			<img key={`star-${index}`} src={starIcon} alt="" className={styles.starIcon} aria-hidden="true" />
		))}
	</div>
);

const Feedback = ({}: Props) => {
	return (
		<section className={styles.section} aria-label="Phản hồi từ người dùng">
			<div className={styles.headingWrap}>
				<h2 className={styles.title}>Hàng triệu người<br/>yêu thích UniLish</h2>
				<div className={styles.metrics}>
					<div className={styles.metricBlock}>
						<p className={styles.metricValue}>4.8</p>
						<p className={styles.metricLabel}>Đánh giá</p>
					</div>
					<div className={styles.metricDivider} aria-hidden="true" />
					<div className={styles.metricBlock}>
						<p className={styles.metricValue}>15M+</p>
						<p className={styles.metricLabel}>Lượt tải</p>
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
