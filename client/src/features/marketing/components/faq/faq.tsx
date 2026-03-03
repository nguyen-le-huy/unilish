import { useState, type ReactNode } from 'react';
import styles from './faq.module.css';

interface Props {}

interface FaqItem {
	question: string;
	answer: ReactNode;
}

const faqItems: FaqItem[] = [
	{
		question: 'How do I get started?',
		answer: (
			<>
				Download our app from the <a href="#">Android Playstore</a> or <a href="#">Apple App store</a>,
				 or <a href="#">sign up on web.</a>
			</>
		),
	},
	{
		question: 'Is UniLish completely free?',
		answer: <>UniLish offers users a 7 day free trial where they can experience all features of the app!</>,
	},
	{
		question: 'I can’t log in to my account, what should I do?',
		answer: (
			<>
				1. Try resetting your password <a href="#">here</a>
				<br />
				2. If still having trouble, feel free to reach out to our support team:{' '}
				<a href="mailto:support@unilish.com">support@unilish.com</a>
			</>
		),
	},
	{
		question: 'When will Speak teach my requested language or support my native language?',
		answer: (
			<>
				Join our <a href="#">waitlist</a>! Your opinions and requests help guide our language roadmap.
			</>
		),
	},
	{
		question: 'I have other questions!',
		answer: (
			<>
				We love questions! Please reach out to our customer support team{' '}
				<a href="mailto:support@unilish.com">support@unilish.com</a> or use our{' '}
				<a href="#">extended FAQ.</a>
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
		<section className={styles.section} aria-label="Frequently asked questions">
			<h2 className={styles.title}>Frequently Asked Questions</h2>

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
