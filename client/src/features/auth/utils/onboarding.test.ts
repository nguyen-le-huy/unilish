import { describe, expect, it } from 'vitest';
import { PATHS } from '@/config/paths';
import {
    getPostAuthRedirectPath,
    getRequiredOnboardingPath,
    hasSelectedLanguage,
    hasSelectedLearningGoal,
    hasSelectedLevel,
} from './onboarding';
import type { User } from '../types';

const makeUser = (overrides: Partial<User> = {}): User => ({
    _id: 'u1',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'student',
    ...overrides,
});

describe('onboarding flow utils', () => {
    it('requires language first', () => {
        const user = makeUser({
            learningLanguageId: null,
            nativeLanguage: null,
            learningGoalId: null,
            learningGoal: null,
            currentLevel: 'A0',
            placementTestScore: 0,
        });

        expect(hasSelectedLanguage(user)).toBe(false);
        expect(getRequiredOnboardingPath(user)).toBe(PATHS.DASHBOARD.LANGUAGE_SELECTION);
    });

    it('requires learning goal after language', () => {
        const user = makeUser({
            learningLanguageId: '507f1f77bcf86cd799439011',
            nativeLanguage: 'en',
            learningGoalId: null,
            learningGoal: null,
            currentLevel: 'A0',
            placementTestScore: 0,
        });

        expect(hasSelectedLanguage(user)).toBe(true);
        expect(hasSelectedLearningGoal(user)).toBe(false);
        expect(getRequiredOnboardingPath(user)).toBe(PATHS.DASHBOARD.GOAL_SELECTION);
    });

    it('requires level when language and goal exist', () => {
        const user = makeUser({
            learningLanguageId: '507f1f77bcf86cd799439011',
            nativeLanguage: 'en',
            learningGoalId: '507f1f77bcf86cd799439012',
            learningGoal: 'travel_survival',
            currentLevel: 'A0',
            placementTestScore: 0,
        });

        expect(hasSelectedLevel(user)).toBe(false);
        expect(getRequiredOnboardingPath(user)).toBe(PATHS.DASHBOARD.LEVEL_SELECTION);
    });

    it('treats level as complete when CEFR is above A0', () => {
        const user = makeUser({
            learningLanguageId: '507f1f77bcf86cd799439011',
            nativeLanguage: 'en',
            learningGoalId: '507f1f77bcf86cd799439012',
            learningGoal: 'travel_survival',
            currentLevel: 'A2',
            placementTestScore: 0,
        });

        expect(hasSelectedLevel(user)).toBe(true);
        expect(getRequiredOnboardingPath(user)).toBeNull();
        expect(getPostAuthRedirectPath(user)).toBe(PATHS.DASHBOARD.HOME);
    });

    it('treats A0 as complete only when placement score > 0', () => {
        const user = makeUser({
            learningLanguageId: '507f1f77bcf86cd799439011',
            nativeLanguage: 'en',
            learningGoalId: '507f1f77bcf86cd799439012',
            learningGoal: 'travel_survival',
            currentLevel: 'A0',
            placementTestScore: 65,
        });

        expect(hasSelectedLevel(user)).toBe(true);
        expect(getRequiredOnboardingPath(user)).toBeNull();
    });
});
