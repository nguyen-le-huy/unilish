import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useOnboardingDraftStore } from '@/stores/onboarding.store';
import { PATHS } from '@/config/paths';
import { useSyncAuthUser } from '@/features/auth/hooks/use-sync-auth-user';
import { getRequiredOnboardingPath } from '@/features/auth/utils/onboarding';

const coalesceNonEmpty = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }

    return null;
};

export const ProtectedRoute = () => {
    const location = useLocation();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const draftLanguageCode = useOnboardingDraftStore((state) => state.languageCode);
    const draftLearningGoal = useOnboardingDraftStore((state) => state.learningGoal);
    const clearOnboardingDraft = useOnboardingDraftStore((state) => state.clear);
    const hasAuthCredentials = isAuthenticated && (Boolean(token) || Boolean(user));

    useSyncAuthUser();

    useEffect(() => {
        if (isAuthenticated && !hasAuthCredentials) {
            logout();
        }
    }, [hasAuthCredentials, isAuthenticated, logout]);

    const onboardingGuardUser = user
        ? {
            ...user,
            nativeLanguage: coalesceNonEmpty(user.nativeLanguage, draftLanguageCode),
            learningGoal: coalesceNonEmpty(user.learningGoal, draftLearningGoal),
        }
        : user;

    const requiredOnboardingPath = hasAuthCredentials
        ? getRequiredOnboardingPath(onboardingGuardUser)
        : null;
    const isPlacementTestPage = location.pathname.startsWith(PATHS.DASHBOARD.PLACEMENT_TEST.ROOT);

    useEffect(() => {
        if (hasAuthCredentials && !requiredOnboardingPath && (draftLanguageCode || draftLearningGoal)) {
            clearOnboardingDraft();
        }
    }, [clearOnboardingDraft, draftLanguageCode, draftLearningGoal, hasAuthCredentials, requiredOnboardingPath]);

    if (!hasAuthCredentials) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    if (
        requiredOnboardingPath
        && location.pathname !== requiredOnboardingPath
        && !(requiredOnboardingPath === PATHS.DASHBOARD.LEVEL_SELECTION && isPlacementTestPage)
    ) {
        return <Navigate to={requiredOnboardingPath} replace />;
    }

    return <Outlet />;
};
