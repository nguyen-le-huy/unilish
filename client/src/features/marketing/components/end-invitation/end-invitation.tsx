import styles from './end-invitation.module.css';
import { Button } from '@/components/core/Button';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';

interface Props {}

const EndInvitation = ({}: Props) => {
	const navigate = useNavigate();

	return (
		<section className={styles.section} aria-label="Get started invitation">
			<h2 className={styles.title}>Start learning a new<br/>language today.</h2>
			<Button
				type="button"
				variant="cta"
				onClick={() => navigate(PATHS.DASHBOARD.ROOT)}
			>
				Get started for free
			</Button>
		</section>
	);
};

export default EndInvitation;
