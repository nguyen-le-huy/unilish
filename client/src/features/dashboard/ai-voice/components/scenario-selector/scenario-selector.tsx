import styles from './scenario-selector.module.css';

interface ScenarioOption {
	id: string;
	title: string;
	description: string;
}

interface ScenarioSelectorProps {
	options: ScenarioOption[];
	selectedScenarioId: string | null;
	onSelectScenario: (scenarioId: string) => void;
}

const ScenarioSelector = ({ options, selectedScenarioId, onSelectScenario }: ScenarioSelectorProps) => {
	return (
		<section className={styles.section} aria-label="Chọn tình huống luyện nói">
			<div className={styles.heading}>
				<span className={styles.sectionNumber}>3</span>
				<div>
					<h2 className={styles.title}>Chọn tình huống hội thoại</h2>
					<p>Chọn ngữ cảnh bạn muốn nhập vai cùng AI.</p>
				</div>
			</div>
			<div className={styles.scenarioGrid}>
				{options.map((option) => {
					const isSelected = selectedScenarioId === option.id;
					const cardClassName = isSelected ? `${styles.scenarioCard} ${styles.scenarioCardSelected}` : styles.scenarioCard;

					return (
						<button
							key={option.id}
							type="button"
							className={cardClassName}
							aria-pressed={isSelected}
							onClick={() => onSelectScenario(option.id)}
						>
							<span className={styles.scenarioText}>
								<span className={styles.cardMeta}><i aria-hidden="true">✦</i> AI đề xuất</span>
								<span className={styles.scenarioTitle}>{option.title}</span>
								<span className={styles.scenarioDescription}>{option.description}</span>
							</span>
							<span className={styles.selectionMark} aria-hidden="true">✓</span>
						</button>
					);
				})}
			</div>
		</section>
	);
};

export default ScenarioSelector;
