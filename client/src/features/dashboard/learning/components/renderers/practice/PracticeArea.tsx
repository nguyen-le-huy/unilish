import { useEffect, useRef } from 'react';
import type { LearnerPracticeQuestion } from './practice.types';
import type { PracticeAnswer } from './practice.types';
import {
    isEmptyAnswer as isAnswerEmpty,
    matchingAnswerToPairs,
    pairsToMatchingAnswer,
} from './practice-answer-utils';
import MultipleChoice from './MultipleChoice';
import FillInBlank from './FillInBlank';
import Matching from './Matching';
import TrueFalse from './TrueFalse';
import ErrorCorrection from './ErrorCorrection';
import styles from './Practice.module.css';

interface PracticeAreaProps {
    questions: LearnerPracticeQuestion[];
    /** Current answers keyed by question ID (controlled by parent). */
    answers: ReadonlyMap<string, PracticeAnswer>;
    /** Called when the learner changes an answer. */
    onAnswerChange: (questionId: string, answer: PracticeAnswer) => void;
    /** Called to remove a MATCHING pair. */
    onRemoveMatchingPair?: (questionId: string, itemId: string) => void;
    /** Whether to show feedback (post-submit mode). */
    showFeedback?: boolean;
    /** Per-question feedback, keyed by question ID. */
    feedback?: ReadonlyMap<string, { correct: boolean; explanation?: string }>;
    /** The question ID to focus (scrolled/auto-focused). */
    focusedQuestionId?: string | null;
    /** Total answered count for the header. */
    answeredCount?: number;
    /** Total question count for the header. */
    totalQuestions?: number;
    /**
     * Current question index for single-question mode (0-based).
     * If provided, only this question renders. Otherwise all questions render.
     */
    currentQuestionIndex?: number;
    /**
     * Callback to proceed to the next question or submit.
     * Called when "Tiếp tục" is pressed or Enter on FILL_IN_BLANK.
     */
    onNext?: () => void;
    /**
     * Whether "Tiếp tục" / "Nộp bài" should be enabled.
     */
    isCurrentComplete?: boolean;
}

const PracticeArea = ({
    questions,
    answers,
    onAnswerChange,
    onRemoveMatchingPair,
    showFeedback = false,
    feedback,
    focusedQuestionId,
    answeredCount,
    totalQuestions,
    currentQuestionIndex,
    onNext,
    isCurrentComplete,
}: PracticeAreaProps) => {
    const handleMCSelect = (questionId: string, optionId: string) => {
        onAnswerChange(questionId, { selectedOptionId: optionId });
    };

    const handleFillChange = (questionId: string, value: string) => {
        onAnswerChange(questionId, { text: value });
    };

    const handleTFChange = (questionId: string, value: boolean) => {
        onAnswerChange(questionId, { value });
    };

    const handleMatchSelect = (questionId: string, itemId: string, targetId: string) => {
        const existing = answers.get(questionId);
        const existingPairs = matchingAnswerToPairs(existing);
        onAnswerChange(questionId, pairsToMatchingAnswer({
            ...existingPairs,
            [itemId]: targetId,
        }));
    };

    const handleMatchRemove = (questionId: string, itemId: string) => {
        onRemoveMatchingPair?.(questionId, itemId);
    };

    const handleErrorCorrectionChange = (questionId: string, value: string) => {
        onAnswerChange(questionId, { text: value });
    };

    if (questions.length === 0) {
        return null;
    }

    const isSingleQuestion = currentQuestionIndex !== undefined;
    const displayAnswered = answeredCount ?? getAnsweredCount(answers, questions);
    const displayTotal = totalQuestions ?? questions.length;

    // In single-question mode, determine which question to render
    const renderedQuestions = isSingleQuestion
        ? [questions[currentQuestionIndex]].filter(Boolean)
        : questions;

    return (
        <div className={styles.practiceArea}>
            {/* Header — only in single-question mode */}
            {isSingleQuestion && (
                <div className={styles.playerHeader}>
                    <span className={styles.questionLabel}>
                        Câu {currentQuestionIndex! + 1} / {displayTotal}
                    </span>
                    <div className={styles.progressBar} role="progressbar" aria-valuenow={displayAnswered} aria-valuemin={0} aria-valuemax={displayTotal}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${(displayAnswered / displayTotal) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Question(s) */}
            {renderedQuestions.map((question) => {
                const realIndex = isSingleQuestion ? currentQuestionIndex! : questions.indexOf(question);
                return (
                    <QuestionWrapper
                        key={question.id}
                        question={question}
                        answer={answers.get(question.id)}
                        showFeedback={showFeedback}
                        feedback={feedback?.get(question.id) ?? null}
                        isFocused={focusedQuestionId === question.id}
                        questionIndex={realIndex}
                        onMCSelect={(id) => handleMCSelect(question.id, id)}
                        onFillChange={(v) => handleFillChange(question.id, v)}
                        onTFChange={(v) => handleTFChange(question.id, v)}
                        onMatchSelect={(itemId, targetId) => handleMatchSelect(question.id, itemId, targetId)}
                        onMatchRemove={(itemId) => handleMatchRemove(question.id, itemId)}
                        onECChange={(v) => handleErrorCorrectionChange(question.id, v)}
                        onEnter={isCurrentComplete ? onNext : undefined}
                    />
                );
            })}
        </div>
    );
};

export default PracticeArea;

// ─── QuestionWrapper ──────────────────────────────────────────────────────────

interface QuestionWrapperProps {
    question: LearnerPracticeQuestion;
    answer: PracticeAnswer | undefined;
    showFeedback: boolean;
    feedback: { correct: boolean; explanation?: string } | null;
    isFocused: boolean;
    questionIndex: number;
    onMCSelect: (optionId: string) => void;
    onFillChange: (value: string) => void;
    onTFChange: (value: boolean) => void;
    onMatchSelect: (itemId: string, targetId: string) => void;
    onMatchRemove: (itemId: string) => void;
    onECChange: (value: string) => void;
    onEnter?: () => void;
}

const QuestionWrapper = ({
    question,
    answer,
    showFeedback,
    feedback,
    isFocused,
    questionIndex,
    onMCSelect,
    onFillChange,
    onTFChange,
    onMatchSelect,
    onMatchRemove,
    onECChange,
    onEnter,
}: QuestionWrapperProps) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFocused && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const firstInput = ref.current.querySelector('button, input, textarea, select');
            if (firstInput instanceof HTMLElement) {
                firstInput.focus();
            }
        }
    }, [isFocused]);

    // Focus the question wrapper when question index changes
    useEffect(() => {
        if (ref.current) {
            ref.current.focus({ preventScroll: true });
        }
    }, [questionIndex]);

    const typeLabel = getTypeLabel(question.type);

    switch (question.type) {
        case 'MULTIPLE_CHOICE':
            return (
                <div ref={ref} tabIndex={isFocused ? -1 : undefined}>
                    <MultipleChoice
                        question={question}
                        selectedId={answer && 'selectedOptionId' in answer ? answer.selectedOptionId : null}
                        onSelect={onMCSelect}
                        feedback={showFeedback ? feedback : null}
                        typeLabel={typeLabel}
                    />
                </div>
            );

        case 'FILL_IN_BLANK':
            return (
                <div ref={ref} tabIndex={isFocused ? -1 : undefined}>
                    <FillInBlank
                        question={question}
                        value={answer && 'text' in answer ? answer.text : ''}
                        onChange={onFillChange}
                        feedback={showFeedback ? feedback : null}
                        typeLabel={typeLabel}
                        onEnter={onEnter}
                    />
                </div>
            );

        case 'MATCHING':
            return (
                <div ref={ref} tabIndex={isFocused ? -1 : undefined}>
                    <Matching
                        question={question}
                        selections={matchingAnswerToPairs(answer)}
                        onSelect={onMatchSelect}
                        onRemove={onMatchRemove}
                        feedback={showFeedback ? feedback : null}
                        typeLabel={typeLabel}
                    />
                </div>
            );

        case 'TRUE_FALSE':
            return (
                <div ref={ref} tabIndex={isFocused ? -1 : undefined}>
                    <TrueFalse
                        question={question}
                        value={answer && 'value' in answer ? answer.value : null}
                        onChange={onTFChange}
                        feedback={showFeedback ? feedback : null}
                        typeLabel={typeLabel}
                    />
                </div>
            );

        case 'ERROR_CORRECTION':
            return (
                <div ref={ref} tabIndex={isFocused ? -1 : undefined}>
                    <ErrorCorrection
                        question={question}
                        value={answer && 'text' in answer ? answer.text : ''}
                        onChange={onECChange}
                        feedback={showFeedback ? feedback : null}
                        typeLabel={typeLabel}
                    />
                </div>
            );

        default:
            return (
                <div className={styles.practiceQuestion}>
                    <p className={styles.stem}>Loại câu hỏi chưa được hỗ trợ</p>
                </div>
            );
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTypeLabel(type: string): string {
    switch (type) {
        case 'MULTIPLE_CHOICE':
            return 'Chọn đáp án';
        case 'FILL_IN_BLANK':
            return 'Điền từ';
        case 'TRUE_FALSE':
            return 'Đúng/Sai';
        case 'MATCHING':
            return 'Nối cặp';
        case 'ERROR_CORRECTION':
            return 'Sửa lỗi';
        default:
            return '';
    }
}

function getAnsweredCount(
    answers: ReadonlyMap<string, PracticeAnswer>,
    questions: LearnerPracticeQuestion[],
): number {
    let count = 0;
    for (const q of questions) {
        const answer = answers.get(q.id);
        if (answer && !isAnswerEmpty(answer)) {
            count++;
        }
    }
    return count;
}
