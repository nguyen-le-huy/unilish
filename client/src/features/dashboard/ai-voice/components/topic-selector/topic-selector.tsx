import { Button } from '@/components/core/Button';
import styles from './topic-selector.module.css';

interface TopicOption {
	id: string;
	label: string;
}

interface TopicSelectorProps {
	options: TopicOption[];
	selectedTopicId: string | null;
	onSelectTopic: (topicId: string) => void;
}

const TopicSelector = ({ options, selectedTopicId, onSelectTopic }: TopicSelectorProps) => {
	return (
		<section className={styles.section} aria-label="Chọn chủ đề luyện nói">
			<h2 className={styles.title}>Hãy chọn chủ đề luyện nói:</h2>
			<div className={styles.optionList}>
				{options.map((option) => {
					const isSelected = selectedTopicId === option.id;

					return (
						<Button
							key={option.id}
							type="button"
							variant={isSelected ? 'primary' : 'outline'}
							padding="B"
							borderColor={isSelected ? undefined : '#000'}
							textColor={isSelected ? undefined : '#000'}
							aria-pressed={isSelected}
							onClick={() => onSelectTopic(option.id)}
						>
							{option.label}
						</Button>
					);
				})}
			</div>
		</section>
	);
};

export default TopicSelector;
