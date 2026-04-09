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

    // If user has completed placement test (has score), consider level as selected
    // even if result is A0
    if (user.placementTestScore && user.placementTestScore > 0) {
        return true;
    }

    // Otherwise, only consider level selected if it's not A0 (manually set)
    return user.currentLevel !== 'A0';
};

export const getRequiredOnboardingPath = (user: User | null): string | null => {
    // If user has completed placement test (has score OR has level other than A0)
    // consider them fully onboarded. They can set language/goal later from settings.
    if (user?.placementTestScore && user.placementTestScore > 0) {
        return null;
    }

    // If user has a level set (not default A0), they've completed placement test
    // even if placementTestScore wasn't properly saved
    if (user?.currentLevel && user.currentLevel !== 'A0') {
        return null;
    }

    const hasLevel = hasSelectedLevel(user);
    const hasGoal = hasSelectedLearningGoal(user);
    const hasLanguage = hasSelectedLanguage(user);

    // If user already has a level and a learning goal they are fully onboarded
    if (hasLevel && hasGoal) {
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
