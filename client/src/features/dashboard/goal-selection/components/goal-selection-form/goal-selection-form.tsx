import { useCallback, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/core/Button/Button';
import { Loading } from '@/components/common/Loading/Loading';
import SelectionCard from '@/components/core/SelectionCard/SelectionCard';
import SelectionForm from '@/components/core/SelectionForm/SelectionForm';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useOnboardingDraftStore } from '@/stores/onboarding.store';
import {
    GOAL_DESCRIPTION_FALLBACK,
    GOAL_EMPTY_STATE_MESSAGE,
} from '../../constants/goal-selection.constants';
import { useLearningGoalsQuery } from '../../hooks/use-learning-goals-query';
import planeIcon from '@/assets/icons/plane.svg';
import styles from './goal-selection-form.module.css';

const GoalSelectionForm = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const languageId = useOnboardingDraftStore((state) => state.languageId);
    const languageCode = useOnboardingDraftStore((state) => state.languageCode);
    const draftGoal = useOnboardingDraftStore((state) => state.learningGoal);
    const setLearningGoalDraft = useOnboardingDraftStore((state) => state.setLearningGoal);
    const resolvedLanguageCode = (languageCode ?? user?.nativeLanguage)?.trim() || null;

    const [selectedId, setSelectedId] = useState<string | null>(draftGoal ?? user?.learningGoal ?? null);
    const { data: goals = [], isLoading, isError, refetch } = useLearningGoalsQuery(languageId ?? undefined);

    const filteredGoals = useMemo(() => {
        if (!languageId) {
            return goals;
        }

        return goals.filter((goal) =>
            Array.isArray(goal.supportedLanguages)
                ? goal.supportedLanguages.includes(languageId)
                : true,
        );
    }, [goals, languageId]);

    const handleContinue = useCallback(() => {
        if (!selectedId || filteredGoals.length === 0) {
            return;
        }

        const selectedGoal = filteredGoals.find((goal) => selectedId === goal.slug || selectedId === goal._id);
        if (!selectedGoal) {
            return;
        }

        setLearningGoalDraft(selectedGoal.slug);
        navigate(PATHS.DASHBOARD.LEVEL_SELECTION);
    }, [filteredGoals, navigate, selectedId, setLearningGoalDraft]);

    if (!resolvedLanguageCode) {
        return <Navigate to={PATHS.DASHBOARD.LANGUAGE_SELECTION} replace />;
    }

    return (
        <SelectionForm
            title="Chọn mục tiêu học tập của bạn"
            subtitle="Hãy chọn mục tiêu học tập bạn mong muốn, bạn có thể thay đổi lựa chọn này sau."
            primaryAction={{ label: 'Tiếp tục', disabled: !selectedId || isLoading, onClick: handleContinue }}
        >
            {isLoading && <Loading variant="inline" size="sm" className={styles.feedback} />}
            {isError && (
                <div className={styles.errorState}>
                    <p className={styles.feedback}>Không thể tải danh sách mục tiêu. Vui lòng thử lại.</p>
                    <Button type="button" variant="outline" padding="B" onClick={() => void refetch()}>
                        Thử lại
                    </Button>
                </div>
            )}

            {!isLoading && !isError && filteredGoals.length === 0 && (
                <p className={styles.feedback}>{GOAL_EMPTY_STATE_MESSAGE}</p>
            )}

            {!isLoading && !isError && filteredGoals.length > 0 && (
                <div className={styles.cardGrid}>
                    {filteredGoals.map((goal) => (
                        <SelectionCard
                            key={goal._id}
                            icon={(
                                <img
                                    src={goal.iconUrl ?? planeIcon}
                                    alt={goal.title}
                                    width={24}
                                    height={24}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = planeIcon;
                                    }}
                                />
                            )}
                            title={goal.title}
                            description={goal.description ?? goal.targetAudience ?? GOAL_DESCRIPTION_FALLBACK}
                            ariaLabel={`Chọn mục tiêu học tập ${goal.title}`}
                            selected={selectedId === goal.slug || selectedId === goal._id}
                            onClick={() => setSelectedId(goal.slug)}
                        />
                    ))}
                </div>
            )}
        </SelectionForm>
    );
};

export default GoalSelectionForm;