import styles from './level-selection-page.module.css';
import LevelSelectionForm from '../components/level-selection-form/level-selection-form';

const LevelSelectionPage = () => {
	return (
		<div className={styles.container}>
			<LevelSelectionForm />
		</div>
	);
};

export default LevelSelectionPage;
