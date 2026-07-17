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

export const hasCompletedPlacementTest = (user: User | null): boolean => {
    if (!user) {
        return false;
    }

    if (user.placementTestCompletedAt) {
        return true;
    }

    if (typeof user.placementTestScore === 'number' && user.placementTestScore > 0) {
        return true;
    }

    if (Array.isArray(user.weakSkills) && user.weakSkills.length > 0) {
        return true;
    }

    return Boolean(user.currentLevel && user.currentLevel !== 'A0');
};

export const hasSelectedLevel = (user: User | null): boolean => {
    if (!user?.currentLevel) {
        return false;
    }

    // A submitted placement test may legitimately place the learner at A0.
    if (hasCompletedPlacementTest(user)) {
        return true;
    }

    // Otherwise, only consider level selected if it's not A0 (manually set)
    return user.currentLevel !== 'A0';
};

export const getRequiredOnboardingPath = (user: User | null): string | null => {
    const hasLevel = hasSelectedLevel(user);
    const hasGoal = hasSelectedLearningGoal(user);
    const hasLanguage = hasSelectedLanguage(user);

    if (hasLevel && hasGoal && hasLanguage) {
        return null;
    }

    if (!hasLanguage) {
        return PATHS.DASHBOARD.LANGUAGE_SELECTION;
    }

    if (!hasGoal) {
        return PATHS.DASHBOARD.GOAL_SELECTION;
    }

    if (!hasLevel) {
        return PATHS.DASHBOARD.LEVEL_SELECTION;
    }

    return null;
};

export const getPostAuthRedirectPath = (user: User): string => {
    return getRequiredOnboardingPath(user) ?? PATHS.DASHBOARD.HOME;
};
