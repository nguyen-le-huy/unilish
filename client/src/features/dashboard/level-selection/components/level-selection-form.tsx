import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import styles from './level-selection-form.module.css';
import SelectionCard from '@/components/core/SelectionCard/SelectionCard';
import SelectionForm from '@/components/core/SelectionForm/SelectionForm';
import { PATHS } from '@/config/paths';
import { queryClient } from '@/lib/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { useOnboardingDraftStore } from '@/stores/onboarding.store';
import { useUpdateOnboardingProfile } from '@/features/dashboard/user';
import {
	ERROR_MISSING_GOAL,
	ERROR_MISSING_LANGUAGE,
	ERROR_ONBOARDING_FAILED,
	LEVELS,
} from '../constants/level-selection.constants';

const LazyPlacementTestIntroModal = lazy(async () => {
	const module = await import('@/features/dashboard/placement-test');
	return { default: module.PlacementTestIntroModal };
});

const LevelSelectionForm = () => {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const setUser = useAuthStore((state) => state.setUser);
	const draftLanguageCode = useOnboardingDraftStore((state) => state.languageCode)?.trim() || null;
	const draftLearningGoal = useOnboardingDraftStore((state) => state.learningGoal)?.trim() || null;
	const profileLanguageCode = user?.nativeLanguage?.trim() || null;
	const profileLearningGoal = user?.learningGoal?.trim() || null;
	const resolvedLanguageCode = draftLanguageCode ?? profileLanguageCode;
	const resolvedLearningGoal = draftLearningGoal ?? profileLearningGoal;
	const { mutate, isPending } = useUpdateOnboardingProfile();
	const guardRedirectPath = useMemo(() => {
		if (!resolvedLanguageCode) {
			return PATHS.DASHBOARD.LANGUAGE_SELECTION;
		}

		if (!resolvedLearningGoal) {
			return PATHS.DASHBOARD.GOAL_SELECTION;
		}

		return null;
	}, [resolvedLanguageCode, resolvedLearningGoal]);

	const handleContinue = useCallback(() => {
		const selectedLevel = LEVELS.find((level) => level.id === selectedId);
		if (!selectedLevel) {
			return;
		}

		if (!resolvedLanguageCode) {
			toast.error(ERROR_MISSING_LANGUAGE);
			navigate(PATHS.DASHBOARD.LANGUAGE_SELECTION);
			return;
		}

		if (!resolvedLearningGoal) {
			toast.error(ERROR_MISSING_GOAL);
			navigate(PATHS.DASHBOARD.GOAL_SELECTION);
			return;
		}

		mutate(
			{
				nativeLanguage: resolvedLanguageCode,
				learningGoal: resolvedLearningGoal,
				currentLevel: selectedLevel.cefrLevel,
			},
			{
				onSuccess: (updatedUser) => {
					const mergedUser = {
						...updatedUser,
						nativeLanguage: updatedUser.nativeLanguage?.trim() || resolvedLanguageCode,
						learningGoal: updatedUser.learningGoal?.trim() || resolvedLearningGoal,
						currentLevel: updatedUser.currentLevel ?? selectedLevel.cefrLevel,
					};

					setUser(mergedUser);
					queryClient.setQueryData(['auth', 'me'], mergedUser);
					navigate(PATHS.DASHBOARD.RECOMMEND_COURSE, { replace: true });
				},
				onError: (error) => {
					const message = error.response?.data?.message ?? ERROR_ONBOARDING_FAILED;
					toast.error(message);
				},
			},
		);
	}, [mutate, navigate, resolvedLanguageCode, resolvedLearningGoal, selectedId, setUser]);

	const handleOpenPlacementTestModal = useCallback(() => {
		setIsModalOpen(true);
	}, []);

	const handleClosePlacementTestModal = useCallback(() => {
		setIsModalOpen(false);
	}, []);

	if (guardRedirectPath) {
		return <Navigate to={guardRedirectPath} replace />;
	}

	return (
		<>
			<SelectionForm
				title="Chọn trình độ tiếng Anh của bạn"
				subtitle="Hãy chọn trình độ hiện tại của bạn theo khung tham chiếu CEFR (A1-C2) hoặc bạn có thể làm bài kiểm tra đầu vào để được đánh giá chính xác hơn."
				primaryAction={{ label: 'Tiếp tục', disabled: !selectedId || isPending, onClick: handleContinue }}
				secondaryAction={{ label: 'Làm bài kiểm tra đầu vào', onClick: handleOpenPlacementTestModal }}
			>
				<div className={styles.cardGrid}>
					{LEVELS.map((level) => (
						<SelectionCard
							key={level.id}
							icon={<img src={level.icon} alt={level.title} width={50} height={50} />}
							title={level.title}
							description={level.description}
							ariaLabel={`Chọn trình độ ${level.title}`}
							selected={selectedId === level.id}
							iconBackground={false}
							onClick={() => setSelectedId(level.id)}
						/>
					))}
				</div>
			</SelectionForm>
			{isModalOpen && (
				<Suspense fallback={null}>
					<LazyPlacementTestIntroModal onClose={handleClosePlacementTestModal} />
				</Suspense>
			)}
		</>
	);
};

export default LevelSelectionForm;
