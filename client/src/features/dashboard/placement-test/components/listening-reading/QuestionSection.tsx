import { useCallback, useState } from 'react';
import { Button } from '@/components/core/Button';
import { QuestionCard } from './QuestionCard';
import styles from './QuestionSection.module.css';
import type { AnswerOption, ToeicQuestion, ToeicPart } from './types';

interface Props {
    questions: ToeicQuestion[];
    nextPart?: ToeicPart;
    onNextPart?: (part: ToeicPart) => void;
    cardLayout?: 'default' | 'part5';
    showSubmitButton?: boolean;
    onSubmitTest?: () => void;
}

export const QuestionSection = ({
    questions: initialQuestions,
    nextPart,
    onNextPart,
    cardLayout = 'default',
    showSubmitButton = false,
    onSubmitTest,
}: Props) => {
    const [questions, setQuestions] = useState<ToeicQuestion[]>(initialQuestions);

    const handleAnswer = useCallback((questionId: string, answer: AnswerOption) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === questionId ? { ...q, selectedAnswer: answer } : q))
        );
    }, []);

    const handleFlag = useCallback((questionId: string) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === questionId ? { ...q, flagged: !q.flagged } : q))
        );
    }, []);

    if (questions.length === 0) return null;

    return (
        <div className={styles.section}>
            {questions.map((question) => (
                <QuestionCard
                    key={question.id}
                    question={question}
                    onAnswer={handleAnswer}
                    onFlag={handleFlag}
                    layout={cardLayout}
                />
            ))}
            {(nextPart || showSubmitButton) && (
                <div className={styles.footer}>
                    <Button
                        type="button"
                        variant="primary"
                        padding="B"
                        onClick={() => {
                            if (showSubmitButton) {
                                onSubmitTest?.();
                                return;
                            }
                            if (nextPart) onNextPart?.(nextPart);
                        }}
                    >
                        {showSubmitButton ? 'Nộp bài' : `Tiếp tục Part ${nextPart}`}
                    </Button>
                </div>
            )}
        </div>
    );
};
