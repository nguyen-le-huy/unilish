import { Button } from '@/components/core/Button';
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
			<h2 className={styles.title}>Các tình huống tạo bởi bởi AI:</h2>
			<div className={styles.scenarioGrid}>
				{options.map((option) => {
					const isSelected = selectedScenarioId === option.id;
					const cardClassName = isSelected ? `${styles.scenarioCard} ${styles.scenarioCardSelected}` : styles.scenarioCard;

					return (
						<Button
							key={option.id}
							type="button"
							variant="outline"
							padding="B"
							className={cardClassName}
							borderColor={isSelected ? '#000' : 'var(--grey)'}
							textColor="#000"
							aria-pressed={isSelected}
							onClick={() => onSelectScenario(option.id)}
						>
							<span className={styles.scenarioText}>
								<span className={styles.scenarioTitle}>{option.title}</span>
								<span className={styles.scenarioDescription}>{option.description}</span>
							</span>
						</Button>
					);
				})}
			</div>
		</section>
	);
};

export default ScenarioSelector;
