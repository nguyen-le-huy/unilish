import styles from './topic-selector.module.css';

interface TopicOption {
	id: string;
	label: string;
	description: string;
	icon: string;
}

interface TopicSelectorProps {
	options: TopicOption[];
	selectedTopicId: string | null;
	onSelectTopic: (topicId: string) => void;
}

const TopicSelector = ({ options, selectedTopicId, onSelectTopic }: TopicSelectorProps) => {
	return (
		<section className={styles.section} aria-label="Chọn chủ đề luyện nói">
			<div className={styles.heading}>
				<span className={styles.sectionNumber}>1</span>
				<div>
					<h2 className={styles.title}>Chọn chủ đề</h2>
					<p>Nội dung bạn muốn luyện trong cuộc hội thoại.</p>
				</div>
			</div>
			<div className={styles.optionList} role="radiogroup" aria-label="Chủ đề luyện nói">
				{options.map((option) => {
					const isSelected = selectedTopicId === option.id;
					const className = isSelected
						? `${styles.optionButton} ${styles.optionButtonSelected}`
						: styles.optionButton;

					return (
						<button
							key={option.id}
							type="button"
							className={className}
							aria-pressed={isSelected}
							role="radio"
							aria-checked={isSelected}
							onClick={() => onSelectTopic(option.id)}
						>
							<span className={styles.optionIcon} aria-hidden="true">{option.icon}</span>
							<span className={styles.optionText}>
								<strong>{option.label}</strong>
								<small>{option.description}</small>
							</span>
							<span className={styles.selectionMark} aria-hidden="true">✓</span>
						</button>
					);
				})}
			</div>
		</section>
	);
};

export default TopicSelector;
