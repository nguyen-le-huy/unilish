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
			<div className={styles.heading}>
				<span className={styles.sectionNumber}>2</span>
				<div>
					<h2 className={styles.title}>Chọn trình độ</h2>
					<p>AI sẽ điều chỉnh tốc độ và từ vựng phù hợp.</p>
				</div>
			</div>
			<div className={styles.optionList} role="radiogroup" aria-label="Trình độ luyện nói">
				{options.map((option) => {
					const isSelected = selectedLevelId === option.id;
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
							onClick={() => onSelectLevel(option.id)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		</section>
	);
};

export default LevelSelector;
