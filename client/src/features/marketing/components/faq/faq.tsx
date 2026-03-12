import { useState, type ReactNode } from 'react';
import styles from './faq.module.css';

interface Props {}

interface FaqItem {
	question: string;
	answer: ReactNode;
}

const faqItems: FaqItem[] = [
	{
		question: 'Làm sao để bắt đầu?',
		answer: (
			<>
				Tải ứng dụng của chúng tôi từ <a href="#">CH Play trên Android</a> hoặc <a href="#">App Store của Apple</a>,
				 hoặc <a href="#">đăng ký trên web.</a>
			</>
		),
	},
	{
		question: 'UniLish có hoàn toàn miễn phí không?',
		answer: <>UniLish tặng người dùng 7 ngày dùng thử miễn phí để trải nghiệm toàn bộ tính năng của ứng dụng!</>,
	},
	{
		question: 'Tôi không thể đăng nhập vào tài khoản, tôi nên làm gì?',
		answer: (
			<>
				1. Hãy thử đặt lại mật khẩu <a href="#">tại đây</a>
				<br />
				2. Nếu vẫn gặp sự cố, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi:{' '}
				<a href="mailto:support@unilish.com">support@unilish.com</a>
			</>
		),
	},
	{
		question: 'Khi nào UniLish sẽ có ngôn ngữ tôi yêu cầu hoặc hỗ trợ tiếng mẹ đẻ của tôi?',
		answer: (
			<>
				Tham gia <a href="#">danh sách chờ</a> của chúng tôi! Ý kiến và yêu cầu của bạn giúp định hướng lộ trình ngôn ngữ.
			</>
		),
	},
	{
		question: 'Tôi còn câu hỏi khác!',
		answer: (
			<>
				Chúng tôi luôn sẵn sàng giải đáp! Vui lòng liên hệ đội ngũ chăm sóc khách hàng{' '}
				<a href="mailto:support@unilish.com">support@unilish.com</a> hoặc xem{' '}
				<a href="#">FAQ mở rộng.</a>
			</>
		),
	},
];

const FAQ = ({}: Props) => {
	const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

	const handleToggle = (index: number) => {
		setOpenItems((previousState) => ({
			...previousState,
			[index]: !previousState[index],
		}));
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleToggle(index);
		}
	};

	return (
		<section className={styles.section} aria-label="Các câu hỏi thường gặp">
			<h2 className={styles.title}>Câu hỏi thường gặp</h2>

			<div className={styles.panel}>
				{faqItems.map((item, index) => (
					<div key={item.question} className={styles.item}>
						<div
							className={styles.itemButton}
							onClick={() => handleToggle(index)}
							onKeyDown={(event) => handleKeyDown(event, index)}
							role="button"
							tabIndex={0}
							aria-expanded={!!openItems[index]}
						>
							<p className={styles.question}>{item.question}</p>
							<span className={styles.plus} aria-hidden="true">
								{openItems[index] ? '×' : '+'}
							</span>
						</div>
						<div
							className={`${styles.answerWrap} ${openItems[index] ? styles.answerOpen : ''}`}
						>
							<div className={styles.answerInner}>
								<p className={styles.answer}>{item.answer}</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
};

export default FAQ;
