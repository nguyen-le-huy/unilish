import { useState, useCallback } from 'react';
import type { IQuestion } from '../../../../../types/course.types';
import { shuffleArray } from '../../../../../lib/array.utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuizPhase = 'idle' | 'playing' | 'finished';

export interface AnswerState {
    selected: string | null;       // MC option id / fill text
    confirmed: boolean;
    isCorrect: boolean | null;
    matchSelections: Record<string, string>; // word → definition
}

interface UsePracticeQuizReturn {
    phase: QuizPhase;
    shuffled: IQuestion[];
    currentIndex: number;
    answers: AnswerState[];
    score: { correct: number; total: number };
    start: () => void;
    confirmAnswer: (state: Partial<AnswerState>) => void;
    next: () => void;
    reset: () => void;
}

const BLANK_ANSWER: AnswerState = {
    selected: null,
    confirmed: false,
    isCorrect: null,
    matchSelections: {},
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePracticeQuiz(questions: IQuestion[]): UsePracticeQuizReturn {
    const [phase, setPhase] = useState<QuizPhase>('idle');
    const [shuffled, setShuffled] = useState<IQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<AnswerState[]>([]);

    const start = useCallback(() => {
        const s = shuffleArray(questions);
        setShuffled(s);
        setAnswers(s.map(() => ({ ...BLANK_ANSWER })));
        setCurrentIndex(0);
        setPhase('playing');
    }, [questions]);

    const confirmAnswer = useCallback((state: Partial<AnswerState>) => {
        setAnswers((prev) =>
            prev.map((a, i) => (i === currentIndex ? { ...a, ...state } : a)),
        );
    }, [currentIndex]);

    const next = useCallback(() => {
        if (currentIndex + 1 >= shuffled.length) {
            setPhase('finished');
        } else {
            setCurrentIndex((c) => c + 1);
        }
    }, [currentIndex, shuffled.length]);

    const reset = useCallback(() => {
        setPhase('idle');
        setShuffled([]);
        setCurrentIndex(0);
        setAnswers([]);
    }, []);

    const correct = answers.filter((a) => a.isCorrect === true).length;

    return {
        phase,
        shuffled,
        currentIndex,
        answers,
        score: { correct, total: shuffled.length },
        start,
        confirmAnswer,
        next,
        reset,
    };
}
