import styles from './level-selection-page.module.css';
import LevelSelectionForm from '../components/level-selection-form/Level-Selection-Form';

const LevelSelectionPage = () => {
	return (
		<div className={styles.container}>
			<LevelSelectionForm />
		</div>
	);
};

export default LevelSelectionPage;
