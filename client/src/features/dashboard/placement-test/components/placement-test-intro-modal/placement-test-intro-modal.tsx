import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import styles from './placement-test-intro-modal.module.css';
import { Button } from '@/components/core/Button';
import oupLogo from '@/assets/images/Oxford_University_Press.svg';
import { PATHS } from '@/config/paths';

interface Props {
	onClose: () => void;
}

interface ModuleRow {
	number: number;
	name: string;
	content: string;
	duration: string;
}

interface ChecklistItem {
	label: string;
	detail: string;
}

const MODULES: ModuleRow[] = [
	{
		number: 1,
		name: 'TOEIC Thu Gọn',
		content: 'Nghe & Đọc hiểu (77 câu trắc nghiệm)',
		duration: '60 phút',
	},
	{
		number: 2,
		name: 'IELTS Writing',
		content: 'Bài luận tiếng Anh (≥150–250 từ)',
		duration: '30 phút',
	},
	{
		number: 3,
		name: 'IELTS Speaking',
		content: 'Phỏng vấn 1:1 với AI Examiner',
		duration: '~15 phút',
	},
];

const CHECKLIST: ChecklistItem[] = [
	{ label: 'Tai nghe', detail: 'để nghe rõ audio phần Listening' },
	{ label: 'Internet ổn định', detail: 'tránh mất kết nối giữa chừng' },
	{ label: 'Nơi yên tĩnh', detail: 'giúp tập trung làm bài hiệu quả hơn' },
	{ label: '~0 phút liên tục', detail: 'không thể tạm dừng giữa chừng' },
];

const PlacementTestIntroModal = ({ onClose }: Props) => {
	const navigate = useNavigate();

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		},
		[onClose],
	);

	useEffect(() => {
		document.addEventListener('keydown', handleKeyDown);
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	}, [handleKeyDown]);

	const handleBackdropClick = useCallback(() => onClose(), [onClose]);

	const handleStart = useCallback(() => {
		onClose();
		navigate(PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING);
	}, [onClose, navigate]);

	return createPortal(
		<div
			className={styles.backdrop}
			onClick={handleBackdropClick}
			role="presentation"
		>
			<div
				className={styles.modal}
				role="dialog"
				aria-modal="true"
				aria-labelledby="pt-modal-title"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					className={styles.closeButton}
					onClick={onClose}
					aria-label="Đóng hộp thoại"
					type="button"
				>
					&#x2715;
				</button>

				{/* Header */}
				<div className={styles.header}>
					<img
						src={oupLogo}
						alt="Oxford University Press"
						className={styles.oupLogo}
					/>
					<h2 id="pt-modal-title" className={styles.title}>
						Bài Kiểm Tra Đầu Vào Theo OUP
					</h2>
					<p className={styles.subtitle}>
						Chúng tôi sẽ đánh giá kỹ năng Listening và Reading của bạn để tạo lộ trình
						học cá nhân hóa chính xác nhất.
					</p>
				</div>

				{/* Module table */}
				<div className={styles.section}>
					<p className={styles.sectionLabel}>Cấu trúc bài thi:</p>
					<div className={styles.tableWrapper}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th className={styles.thNum} scope="col" />
									<th className={styles.th} scope="col">Phần</th>
									<th className={styles.th} scope="col">Nội dung</th>
									<th className={styles.thTime} scope="col">Thời gian</th>
								</tr>
							</thead>
							<tbody>
								{MODULES.map((mod) => (
									<tr key={mod.number} className={styles.tr}>
										<td className={styles.tdNum}>{mod.number}</td>
										<td className={styles.tdName}>{mod.name}</td>
										<td className={styles.tdContent}>{mod.content}</td>
										<td className={styles.tdTime}>{mod.duration}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Checklist */}
				<div className={styles.section}>
					<p className={styles.sectionLabel}>Trước khi bắt đầu, hãy đảm bảo:</p>
					<ol className={styles.checklist}>
						{CHECKLIST.map((item) => (
							<li key={item.label} className={styles.checklistItem}>
								<strong>{item.label}</strong>
								{' — '}
								{item.detail}
							</li>
						))}
					</ol>
				</div>

				{/* Footer */}
				<div className={styles.footer}>
					<Button
						type="button"
						variant="primary"
						padding="B"
						onClick={handleStart}
					>
						Tôi đã sẵn sàng
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default PlacementTestIntroModal;
