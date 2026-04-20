import { Button } from '@/components/core/Button';
import styles from './level-selector.module.css';

interface LevelOption {
	id: string;
	label: string;
}

interface LevelSelectorProps {
	options: LevelOption[];
	selectedLevelId: string | null;
	onSelectLevel: (levelId: string) => void;
}

const LevelSelector = ({ options, selectedLevelId, onSelectLevel }: LevelSelectorProps) => {
	return (
		<section className={styles.section} aria-label="Chọn level luyện nói">
			<h2 className={styles.title}>Level:</h2>
			<div className={styles.optionList}>
				{options.map((option) => {
					const isSelected = selectedLevelId === option.id;

					return (
						<Button
							key={option.id}
							type="button"
							variant={isSelected ? 'primary' : 'outline'}
							padding="B"

							borderColor={isSelected ? undefined : '#000'}
							textColor={isSelected ? undefined : '#000'}
							aria-pressed={isSelected}
							onClick={() => onSelectLevel(option.id)}
						>
							{option.label}
						</Button>
					);
				})}
			</div>
		</section>
	);
};

export default LevelSelector;
