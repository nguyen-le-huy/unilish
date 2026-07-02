// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearnerLessonDto } from '../../types/learning.types';
import LessonPlayerPage from './LessonPlayerPage';

const { startLessonMock, submitLessonMock } = vi.hoisted(() => ({
    startLessonMock: vi.fn(),
    submitLessonMock: vi.fn(),
}));

const lessonData: LearnerLessonDto = {
    course: { id: 'course-1', slug: 'travel-a1', name: 'Travel A1' },
    unit: { id: 'unit-1', title: 'Introductions', orderIndex: 1 },
    lesson: {
        id: 'lesson-grammar',
        title: 'To Be',
        type: 'GRAMMAR',
        orderIndex: 2,
        content: { type: 'GRAMMAR' },
        passingScore: null,
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
        refetch: vi.fn(),
    }),
    // Return a new wrapper on every render, matching React Query's hook shape.
    useStartLesson: () => ({ mutate: startLessonMock }),
    useSubmitLesson: () => ({ mutate: submitLessonMock }),
}));

vi.mock('../../hooks/use-course-roadmap', () => ({
    useCourseRoadmap: () => ({ data: undefined }),
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
});
