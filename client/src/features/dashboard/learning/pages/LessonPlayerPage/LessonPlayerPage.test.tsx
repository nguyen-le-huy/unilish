// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearnerLessonDto } from '../../types/learning.types';
import LessonPlayerPage from './LessonPlayerPage';

const { startLessonMock, submitLessonMock, saveCheckpointMock, restartLessonMock, completeLessonMock, refetchMock } = vi.hoisted(() => ({
    startLessonMock: vi.fn(),
    submitLessonMock: vi.fn(),
    saveCheckpointMock: vi.fn(),
    restartLessonMock: vi.fn(),
    completeLessonMock: vi.fn(),
    refetchMock: vi.fn(),
}));

let lessonData: LearnerLessonDto = {
    course: { id: 'course-1', slug: 'travel-a1', name: 'Travel A1' },
    unit: { id: 'unit-1', title: 'Introductions', orderIndex: 1 },
        lesson: {
            id: 'lesson-grammar',
            title: 'To Be',
            type: 'GRAMMAR',
            orderIndex: 2,
            content: { type: 'GRAMMAR' },
            passingScore: null,
            exercise: {
                kind: 'OBJECTIVE' as const,
                mode: 'FIXED' as const,
                passingScore: 80,
                questions: [],
            },
        },
    progress: {
        status: 'NOT_STARTED',
        checkpoint: null,
        checkpointVersion: 0,
        bestScore: null,
    },
    navigation: { previousLessonId: null, nextLessonId: null },
};

vi.mock('../../hooks/use-lesson', () => ({
    useLesson: () => ({
        data: lessonData,
        isLoading: false,
        isError: false,
        refetch: refetchMock,
    }),
    useStartLesson: () => ({ mutate: startLessonMock }),
    useSaveCheckpoint: () => ({ mutateAsync: saveCheckpointMock }),
    useSubmitLesson: () => ({ mutate: submitLessonMock }),
    useRestartLesson: () => ({ mutateAsync: restartLessonMock, isPending: false }),
    useCompleteLesson: () => ({ mutateAsync: completeLessonMock, isPending: false }),
}));

vi.mock('../../hooks/use-course-roadmap', () => ({
    useCourseRoadmap: () => ({ data: undefined }),
}));

vi.mock('../../hooks/use-exercise-state', () => ({
    useExerciseState: () => ({
        answers: new Map(),
        answeredCount: 0,
        totalQuestions: 0,
        currentQuestionIndex: 0,
        currentQuestion: { question: { id: '', version: 1, type: 'MULTIPLE_CHOICE' as const, stem: {}, options: [] }, answer: undefined },
        answerRevision: 0,
        staleCount: 0,
        setCurrentQuestionIndex: vi.fn(),
        setAnswer: vi.fn(),
        removeMatchingPair: vi.fn(),
        resetAnswers: vi.fn(),
        getSubmissionAnswers: () => [],
        validateComplete: () => ({ valid: true, firstMissingId: null, missingCount: 0 }),
        isQuestionComplete: () => true,
    }),
}));

vi.mock('../../hooks/use-autosave', () => ({
    useAutosave: () => ({
        status: 'saved' as const,
        markDirty: vi.fn(),
        flush: () => Promise.resolve(),
        reset: vi.fn(),
    }),
}));

vi.mock('../../components/renderers/LessonRenderer', () => ({
    default: () => <div>Grammar content</div>,
}));

vi.mock('../../components/result/ResultPanel', () => ({
    default: () => <div>Lesson result</div>,
}));

describe('LessonPlayerPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        refetchMock.mockResolvedValue(undefined);
        restartLessonMock.mockResolvedValue({
            progressId: 'progress-1',
            status: 'IN_PROGRESS',
            checkpointVersion: 0,
        });
        completeLessonMock.mockResolvedValue({
            lessonStatus: 'COMPLETED',
            unitStatus: 'COMPLETED',
            courseStatus: 'ACTIVE',
            courseProgressPercent: 50,
            nextLessonId: null,
        });
        lessonData = {
            course: { id: 'course-1', slug: 'travel-a1', name: 'Travel A1' },
            unit: { id: 'unit-1', title: 'Introductions', orderIndex: 1 },
            lesson: {
                id: 'lesson-grammar',
                title: 'To Be',
                type: 'GRAMMAR',
                orderIndex: 2,
                content: { type: 'GRAMMAR' },
                passingScore: null,
                exercise: {
                    kind: 'OBJECTIVE' as const,
                    mode: 'FIXED' as const,
                    passingScore: 80,
                    questions: [],
                },
            },
            progress: {
                status: 'NOT_STARTED',
                checkpoint: null,
                checkpointVersion: 0,
                bestScore: null,
            },
            navigation: { previousLessonId: null, nextLessonId: null },
        };
    });

    afterEach(() => {
        cleanup();
    });

    it('starts a lesson only once when the component rerenders', async () => {
        const view = render(
            <MemoryRouter initialEntries={['/dashboard/learning/lessons/lesson-grammar']}>
                <Routes>
                    <Route path="/dashboard/learning/lessons/:lessonId" element={<LessonPlayerPage />} />
                </Routes>
            </MemoryRouter>,
        );

        await waitFor(() => expect(startLessonMock).toHaveBeenCalledTimes(1));
        expect(screen.queryByText('Grammar content')).not.toBeNull();

        view.rerender(
            <MemoryRouter initialEntries={['/dashboard/learning/lessons/lesson-grammar']}>
                <Routes>
                    <Route path="/dashboard/learning/lessons/:lessonId" element={<LessonPlayerPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(startLessonMock).toHaveBeenCalledTimes(1);
    });

    it('renders only lesson content for a previously completed lesson', () => {
        lessonData = {
            ...lessonData,
            progress: {
                status: 'COMPLETED',
                checkpoint: null,
                checkpointVersion: 0,
                bestScore: 100,
            },
        };

        render(
            <MemoryRouter initialEntries={['/dashboard/learning/lessons/lesson-grammar']}>
                <Routes>
                    <Route path="/dashboard/learning/lessons/:lessonId" element={<LessonPlayerPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.queryByRole('button', { name: 'Làm lại' })).toBeNull();
        expect(screen.queryByText('Lesson result')).toBeNull();
        expect(screen.queryByText('Grammar content')).not.toBeNull();
        expect(restartLessonMock).not.toHaveBeenCalled();
    });

    it('marks the lesson as completed when learner clicks the completion button', async () => {
        render(
            <MemoryRouter initialEntries={['/dashboard/learning/lessons/lesson-grammar']}>
                <Routes>
                    <Route path="/dashboard/learning/lessons/:lessonId" element={<LessonPlayerPage />} />
                </Routes>
            </MemoryRouter>,
        );

        screen.getByRole('button', { name: /đánh dấu hoàn thành/i }).click();

        await waitFor(() => expect(completeLessonMock).toHaveBeenCalledWith('lesson-grammar'));
        await waitFor(() => expect(refetchMock).toHaveBeenCalled());
    });
});
