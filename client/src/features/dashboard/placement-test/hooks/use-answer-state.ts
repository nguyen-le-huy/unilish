import { useCallback, useEffect, useState } from 'react';
import type { PartInfo, PartQuestionStatus, ToeicPart } from '../components/listening-reading/types';
import type { LocalAnswerState, RuntimeAttempt } from '../types/runtime.types';

interface UseAnswerStateParams {
    attempt?: RuntimeAttempt;
    isSubmitting: boolean;
    queueSave: (questionId: string, value: LocalAnswerState) => void;
}

type QuestionStateFields = {
    selectedAnswer?: LocalAnswerState['selectedOption'];
    flagged?: boolean;
};

type WithQuestionState<T extends { id: string; questions?: Array<{ id: string }> }> =
    T extends { questions: Array<infer Q> }
        ? Omit<T, 'questions'> & { questions: Array<Q & QuestionStateFields> }
        : T & QuestionStateFields;

export const useAnswerState = ({ attempt, isSubmitting, queueSave }: UseAnswerStateParams) => {
    const [localAnswerMap, setLocalAnswerMap] = useState<Record<string, LocalAnswerState>>({});

    useEffect(() => {
        if (!attempt) {
            return;
        }

        const answerMap: Record<string, LocalAnswerState> = {};
        for (const item of attempt.answerSheet) {
            answerMap[item.questionId] = {
                selectedOption: item.selectedOption ?? null,
                flagged: item.flagged,
            };
        }

        setLocalAnswerMap(answerMap);
    }, [attempt?.attemptId]);

    const updateAnswerState = useCallback((questionId: string, updater: (prev: LocalAnswerState) => LocalAnswerState) => {
        setLocalAnswerMap((previous) => {
            const current: LocalAnswerState = previous[questionId] ?? {
                selectedOption: null,
                flagged: false,
            };
            const nextValue = updater(current);
            queueSave(questionId, nextValue);
            return {
                ...previous,
                [questionId]: nextValue,
            };
        });
    }, [queueSave]);

    const handleAnswer = useCallback((questionId: string, answer: LocalAnswerState['selectedOption']) => {
        if (isSubmitting || !answer) {
            return;
        }

        updateAnswerState(questionId, (previous) => ({
            ...previous,
            selectedOption: answer,
        }));
    }, [isSubmitting, updateAnswerState]);

    const handleFlag = useCallback((questionId: string) => {
        if (isSubmitting) {
            return;
        }

        updateAnswerState(questionId, (previous) => ({
            ...previous,
            flagged: !previous.flagged,
        }));
    }, [isSubmitting, updateAnswerState]);

    const applyQuestionStates = useCallback(
        <T extends { id: string; questions?: Array<{ id: string }> }>(items: T[]): Array<WithQuestionState<T>> => {
            return items.map((item) => {
                if ('questions' in item && Array.isArray(item.questions)) {
                    const questions = item.questions.map((question) => {
                        const state = localAnswerMap[question.id];
                        return {
                            ...question,
                            selectedAnswer: state?.selectedOption,
                            flagged: state?.flagged,
                        };
                    });

                    return {
                        ...item,
                        questions,
                    } as unknown as WithQuestionState<T>;
                }

                const state = localAnswerMap[item.id];
                return {
                    ...item,
                    selectedAnswer: state?.selectedOption,
                    flagged: state?.flagged,
                } as unknown as WithQuestionState<T>;
            });
        },
        [localAnswerMap],
    );

    const buildQuestionStatuses = useCallback((
        partInfos: PartInfo[],
        partQuestions: Partial<Record<ToeicPart, Array<{ id: string; questionNumber: number }>>>,
    ): Partial<Record<ToeicPart, PartQuestionStatus[]>> => {
        const statuses: Partial<Record<ToeicPart, PartQuestionStatus[]>> = {};

        for (const partInfo of partInfos) {
            const questions = partQuestions[partInfo.part] ?? [];
            statuses[partInfo.part] = questions.map((question) => {
                const answerState = localAnswerMap[question.id];
                const state = answerState?.flagged
                    ? 'flagged'
                    : answerState?.selectedOption
                        ? 'answered'
                        : 'unanswered';

                return {
                    questionId: question.id,
                    number: question.questionNumber,
                    state,
                };
            });
        }

        return statuses;
    }, [localAnswerMap]);

    return {
        localAnswerMap,
        handleAnswer,
        handleFlag,
        applyQuestionStates,
        buildQuestionStatuses,
    };
};
