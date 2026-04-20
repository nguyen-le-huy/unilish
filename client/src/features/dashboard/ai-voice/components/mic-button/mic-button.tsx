import micIcon from '@/assets/icons/mic.svg';
import retryIcon from '@/assets/icons/retry.svg';
import stopIcon from '@/assets/icons/stop.svg';
import waveIcon from '@/assets/icons/wave.svg';
import type { PttStatus } from '../../types/ai-voice.types';
import styles from './mic-button.module.css';

interface MicButtonProps {
	status: PttStatus;
	onToggle: () => void;
}

interface StatusUi {
	className: string;
	ariaLabel: string;
	iconSrc: string;
}

const STATUS_UI: Record<Exclude<PttStatus, 'ended' | 'processing'>, StatusUi> = {
	idle: {
		className: styles.idle,
		ariaLabel: 'Mở micro để nói',
		iconSrc: micIcon,
	},
	recording: {
		className: styles.recording,
		ariaLabel: 'Nhấn để dừng ghi âm',
		iconSrc: stopIcon,
	},
	ai_speaking: {
		className: styles.aiSpeaking,
		ariaLabel: 'AI đang phản hồi',
		iconSrc: waveIcon,
	},
	error: {
		className: styles.error,
		ariaLabel: 'Đã có lỗi, nhấn để thử lại',
		iconSrc: retryIcon,
	},
};

const MicButton = ({ status, onToggle }: MicButtonProps) => {
	if (status === 'ended') {
		return null;
	}

	const isDisabled = status === 'processing' || status === 'ai_speaking';
	const ui = status === 'processing'
		? {
			className: styles.processing,
			ariaLabel: 'Đang xử lý giọng nói',
			iconSrc: '',
		}
		: STATUS_UI[status];

	return (
		<button
			type="button"
			className={`${styles.micButton} ${ui.className}`}
			aria-label={ui.ariaLabel}
			aria-pressed={status === 'recording'}
			disabled={isDisabled}
			onClick={onToggle}
		>
			{status === 'processing' ? (
				<span className={styles.spinner} aria-hidden="true" />
			) : (
				<img src={ui.iconSrc} alt="" className={styles.micIcon} aria-hidden="true" />
			)}
		</button>
	);
};

export default MicButton;
