import styles from './goal-selection-page.module.css';
import GoalSelectionForm from '../components/goal-selection-form/Goal-Selection-Form';

const GoalSelectionPage = () => {
	return (
		<div className={styles.container}>
			<GoalSelectionForm />
		</div>
	);
};

export default GoalSelectionPage;