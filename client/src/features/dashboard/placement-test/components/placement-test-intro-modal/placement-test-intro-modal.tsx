import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import styles from './placement-test-intro-modal.module.css';
import { Button } from '@/components/core/Button';
import oupLogo from '@/assets/images/Oxford_University_Press.svg';
import { PATHS } from '@/config/paths';
import { queryClient } from '@/lib/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useOnboardingDraftStore } from '@/stores/onboarding.store';
import { useUpdateOnboardingProfile } from '@/features/dashboard/user';

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
		name: 'Nghe & Đọc',
		content: 'Nghe & Đọc hiểu (77 câu trắc nghiệm)',
		duration: '60 phút',
	},
];

const CHECKLIST: ChecklistItem[] = [
	{ label: 'Tai nghe', detail: 'để nghe rõ audio phần Listening' },
	{ label: 'Internet ổn định', detail: 'tránh mất kết nối giữa chừng' },
	{ label: 'Nơi yên tĩnh', detail: 'giúp tập trung làm bài hiệu quả hơn' },
	{ label: 'Làm bài liên tục', detail: 'không thể tạm dừng giữa chừng' },
];

const PlacementTestIntroModal = ({ onClose }: Props) => {
	const navigate = useNavigate();
	const [isStarting, setIsStarting] = useState(false);
	const user = useAuthStore((state) => state.user);
	const setUser = useAuthStore((state) => state.setUser);
	const draftLanguageCode = useOnboardingDraftStore((state) => state.languageCode)?.trim() || null;
	const draftLearningGoal = useOnboardingDraftStore((state) => state.learningGoal)?.trim() || null;
	const profileLanguageCode = user?.nativeLanguage?.trim() || null;
	const profileLearningGoal = user?.learningGoal?.trim() || null;
	const resolvedLanguageCode = draftLanguageCode ?? profileLanguageCode;
	const resolvedLearningGoal = draftLearningGoal ?? profileLearningGoal;
	const updateOnboardingProfileMutation = useUpdateOnboardingProfile();

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

	const handleStart = useCallback(async () => {
		if (isStarting) {
			return;
		}

		if (!resolvedLanguageCode || !resolvedLearningGoal) {
			toast.error('Vui lòng chọn ngôn ngữ và mục tiêu học tập trước khi làm bài kiểm tra.');
			onClose();
			navigate(!resolvedLanguageCode ? PATHS.DASHBOARD.LANGUAGE_SELECTION : PATHS.DASHBOARD.GOAL_SELECTION);
			return;
		}

		try {
			setIsStarting(true);
			const updatedUser = await updateOnboardingProfileMutation.mutateAsync({
				nativeLanguage: resolvedLanguageCode,
				learningGoal: resolvedLearningGoal,
			});
			const mergedUser = {
				...updatedUser,
				nativeLanguage: updatedUser.nativeLanguage?.trim() || resolvedLanguageCode,
				learningGoal: updatedUser.learningGoal?.trim() || resolvedLearningGoal,
				learningLanguageId: updatedUser.learningLanguageId ?? user?.learningLanguageId,
				learningGoalId: updatedUser.learningGoalId ?? user?.learningGoalId,
			};

			setUser(mergedUser);
			queryClient.setQueryData(['auth', 'me'], mergedUser);
			onClose();
			navigate(PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING);
		} catch {
			toast.error('Không thể lưu lựa chọn học tập. Vui lòng thử lại.');
		} finally {
			setIsStarting(false);
		}
	}, [
		isStarting,
		navigate,
		onClose,
		resolvedLanguageCode,
		resolvedLearningGoal,
		setUser,
		updateOnboardingProfileMutation,
		user?.learningGoalId,
		user?.learningLanguageId,
	]);

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
						Xác định trình độ tiếng Anh của bạn
					</h2>
					<p className={styles.subtitle}>
						Hoàn thành bài kiểm tra Nghe &amp; Đọc để nhận trình độ CEFR và lộ trình học phù hợp.
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
						disabled={isStarting}
						onClick={handleStart}
					>
						{isStarting ? 'Đang chuẩn bị...' : 'Tôi đã sẵn sàng'}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default PlacementTestIntroModal;
