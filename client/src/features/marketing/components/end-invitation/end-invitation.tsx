import styles from './end-invitation.module.css';
import { Button } from '@/components/core/Button';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';

interface Props {}

const EndInvitation = ({}: Props) => {
	const navigate = useNavigate();

	return (
		<section className={styles.section} aria-label="Lời mời bắt đầu học">
			<h2 className={styles.title}>Bắt đầu học một<br/>ngôn ngữ mới ngay hôm nay.</h2>
			<Button
				type="button"
				variant="cta"
				onClick={() => navigate(PATHS.DASHBOARD.ROOT)}
			>
				Bắt đầu miễn phí
			</Button>
		</section>
	);
};

export default EndInvitation;
