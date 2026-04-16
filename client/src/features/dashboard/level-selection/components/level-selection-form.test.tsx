// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/features/auth/types';
import { PATHS } from '@/config/paths';
import type { UpdateOnboardingProfilePayload } from '@/features/dashboard/user/api/update-onboarding-profile';
import { ERROR_ONBOARDING_FAILED } from '../constants/level-selection.constants';
import LevelSelectionForm from './level-selection-form';

interface OnboardingMockState {
    languageCode: string | null;
    learningGoal: string | null;
    clear: () => void;
}

interface MutateOptions {
    onSuccess?: (updatedUser: User) => void;
    onError?: (error: { response?: { data?: { message?: string } } }) => void;
}

const {
    clearDraftMock,
    setUserMock,
    mutateMock,
    toastErrorMock,
} = vi.hoisted(() => ({
    clearDraftMock: vi.fn(),
    setUserMock: vi.fn(),
    mutateMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

let onboardingMockState: OnboardingMockState = {
    languageCode: 'vi',
    learningGoal: 'travel',
    clear: clearDraftMock,
};

vi.mock('@/stores/onboarding.store', () => ({
    useOnboardingDraftStore: <T,>(selector: (state: OnboardingMockState) => T) => selector(onboardingMockState),
}));

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: <T,>(selector: (state: { setUser: (user: User) => void }) => T) => selector({ setUser: setUserMock }),
}));

vi.mock('@/features/dashboard/user', () => ({
    useUpdateOnboardingProfile: () => ({
        mutate: mutateMock,
        isPending: false,
    }),
}));

vi.mock('@/features/dashboard/placement-test', () => ({
    PlacementTestIntroModal: ({ onClose }: { onClose: () => void }) => (
        <button type="button" onClick={onClose}>Mock Placement Modal</button>
    ),
}));

vi.mock('sonner', () => ({
    toast: {
        error: toastErrorMock,
    },
}));

const renderWithRoutes = () => {
    render(
        <MemoryRouter initialEntries={[PATHS.DASHBOARD.LEVEL_SELECTION]}>
            <Routes>
                <Route path={PATHS.DASHBOARD.LEVEL_SELECTION} element={<LevelSelectionForm />} />
                <Route path={PATHS.DASHBOARD.LANGUAGE_SELECTION} element={<p>Language Selection Redirect</p>} />
                <Route path={PATHS.DASHBOARD.GOAL_SELECTION} element={<p>Goal Selection Redirect</p>} />
            </Routes>
        </MemoryRouter>,
    );
};

describe('LevelSelectionForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        onboardingMockState = {
            languageCode: 'vi',
            learningGoal: 'travel',
            clear: clearDraftMock,
        };
    });

    afterEach(() => {
        cleanup();
    });

    it('disables continue button until a level is selected', () => {
        renderWithRoutes();

        const continueButton = screen.getByRole('button', { name: 'Tiếp tục' });
        expect(continueButton.getAttribute('disabled')).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Chọn trình độ A1 - Cơ bản' }));

        expect(continueButton.getAttribute('disabled')).toBeNull();
    });

    it('submits selected level and finalizes onboarding on success', () => {
        const updatedUser: User = {
            _id: 'u-1',
            email: 'user@example.com',
            fullName: 'Unit Test User',
            role: 'student',
            nativeLanguage: 'vi',
            learningGoal: 'travel',
            currentLevel: 'B1',
        };

        mutateMock.mockImplementation((payload: UpdateOnboardingProfilePayload, options?: MutateOptions) => {
            void payload;
            options?.onSuccess?.(updatedUser);
        });

        renderWithRoutes();

        fireEvent.click(screen.getByRole('button', { name: 'Chọn trình độ B1 - Trung cấp' }));
        fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

        expect(mutateMock).toHaveBeenCalledWith(
            {
                nativeLanguage: 'vi',
                learningGoal: 'travel',
                currentLevel: 'B1',
            },
            expect.any(Object),
        );
        expect(setUserMock).toHaveBeenCalledWith(updatedUser);
        expect(clearDraftMock).not.toHaveBeenCalled();
    });

    it('redirects to language selection when language draft is missing', () => {
        onboardingMockState = {
            languageCode: null,
            learningGoal: 'travel',
            clear: clearDraftMock,
        };

        renderWithRoutes();

        expect(screen.queryByText('Language Selection Redirect')).not.toBeNull();
    });

    it('redirects to goal selection when goal draft is missing', () => {
        onboardingMockState = {
            languageCode: 'vi',
            learningGoal: null,
            clear: clearDraftMock,
        };

        renderWithRoutes();

        expect(screen.queryByText('Goal Selection Redirect')).not.toBeNull();
    });

    it('shows fallback toast when onboarding update fails without server message', () => {
        mutateMock.mockImplementation((_payload: UpdateOnboardingProfilePayload, options?: MutateOptions) => {
            options?.onError?.({ response: { data: {} } });
        });

        renderWithRoutes();

        fireEvent.click(screen.getByRole('button', { name: 'Chọn trình độ A2 - Sơ cấp' }));
        fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));

        expect(toastErrorMock).toHaveBeenCalledWith(ERROR_ONBOARDING_FAILED);
    });
});
