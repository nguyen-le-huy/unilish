// @vitest-environment jsdom
//
// Phase 4A - FE-12: Frontend integration tests
// Tests full user flows with hook-level mocks.

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LessonPlayerPage from './LessonPlayerPage';

const mocks = vi.hoisted(() => ({
    submitLesson: vi.fn(),
    saveCheckpoint: vi.fn().mockResolvedValue({
        progressId: 'p1',
        checkpointVersion: 1,
        timeSpentSeconds: 30,
        status: 'IN_PROGRESS',
    }),
    startLesson: vi.fn(),
    restartLesson: vi.fn().mockResolvedValue({ progressId: 'p2', status: 'IN_PROGRESS', checkpointVersion: 0 }),
    refetch: vi.fn(),
}));

let lessonData: Record<string, unknown>;

function makeLessonData() {
    return {
        course: { id: 'c1', slug: 'travel-a1', name: 'Travel A1' },
        unit: { id: 'u1', title: 'Introductions', orderIndex: 1 },
        lesson: {
            id: 'l1', title: 'To Be', type: 'GRAMMAR', orderIndex: 2,
            content: { type: 'GRAMMAR' as const, conceptName: 'Test', hero: { hook: 'Grammar lesson content', contextSentences: [] }, blocks: [], summaryTable: { columns: ['a', 'b', 'c'], rows: [] }, taughtConcepts: [] },
            passingScore: 80,
            exercise: {
                kind: 'OBJECTIVE' as const, mode: 'FIXED' as const, passingScore: 80,
                questions: [
                    { id: 'q1', version: 1, type: 'MULTIPLE_CHOICE' as const, stem: { text: 'Choose:' }, options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }] },
                    { id: 'q2', version: 1, type: 'TRUE_FALSE' as const, stem: { text: 'True?' } },
                ],
            },
        },
        progress: { status: 'NOT_STARTED', checkpoint: null, checkpointVersion: 0, bestScore: null },
        navigation: { previousLessonId: null, nextLessonId: 'l2' },
    };
}

vi.mock('../../hooks/use-lesson', () => ({
    useLesson: () => ({ data: lessonData, isLoading: false, isError: false, refetch: mocks.refetch }),
    useStartLesson: () => ({ mutate: mocks.startLesson }),
    useSaveCheckpoint: () => ({ mutateAsync: mocks.saveCheckpoint }),
    useSubmitLesson: () => ({ mutate: mocks.submitLesson }),
    useRestartLesson: () => ({ mutateAsync: mocks.restartLesson, isPending: false }),
}));

vi.mock('../../hooks/use-course-roadmap', () => ({
    useCourseRoadmap: () => ({ data: undefined }),
}));

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/dashboard/learning/lessons/l1']}>
            <Routes>
                <Route path="/dashboard/learning/lessons/:lessonId" element={<LessonPlayerPage />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('LessonPlayerPage flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        lessonData = makeLessonData();
    });

    afterEach(() => { cleanup(); });

    it('renders lesson content without learner exercises', () => {
        renderPage();

        expect(screen.getByText('Grammar lesson content')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /bắt đầu làm bài/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /nộp bài/i })).toBeNull();
        expect(mocks.saveCheckpoint).not.toHaveBeenCalled();
        expect(mocks.submitLesson).not.toHaveBeenCalled();
    });
});
