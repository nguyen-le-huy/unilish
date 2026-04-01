import { PATHS } from '@/config/paths';
import type { User } from '../types';

export const hasSelectedLanguage = (user: User | null): boolean => {
    // Backend stores learningLanguageId (ObjectId), frontend may store nativeLanguage (string)
    return Boolean(user?.learningLanguageId || user?.nativeLanguage);
};

export const hasSelectedLearningGoal = (user: User | null): boolean => {
    // Backend stores learningGoalId (ObjectId), frontend may store learningGoal (string)
    return Boolean(user?.learningGoalId || user?.learningGoal);
};

export const hasSelectedLevel = (user: User | null): boolean => {
    if (!user?.currentLevel) {
        return false;
    }

    if (user.currentLevel !== 'A0') {
        return true;
    }

    return (user.placementTestScore ?? 0) > 0;
};

export const getRequiredOnboardingPath = (user: User | null): string | null => {
    // If user already has a level and a learning goal they are fully onboarded —
    // skip all onboarding forms regardless of whether nativeLanguage is set.
    if (hasSelectedLevel(user) && hasSelectedLearningGoal(user)) {
        return null;
    }

    if (!hasSelectedLanguage(user)) {
        return PATHS.DASHBOARD.LANGUAGE_SELECTION;
    }

    if (!hasSelectedLearningGoal(user)) {
        return PATHS.DASHBOARD.GOAL_SELECTION;
    }

    if (!hasSelectedLevel(user)) {
        return PATHS.DASHBOARD.LEVEL_SELECTION;
    }

    return null;
};

export const getPostAuthRedirectPath = (user: User): string => {
    return getRequiredOnboardingPath(user) ?? PATHS.DASHBOARD.HOME;
};
