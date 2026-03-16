import { Button } from '@/components/core/Button';
import { QuestionCard } from './question-card';
import styles from './question-section.module.css';
import type { AnswerOption, ToeicQuestion, ToeicPart } from './types';

interface Props {
    questions: ToeicQuestion[];
    nextPart?: ToeicPart;
    onNextPart?: (part: ToeicPart) => void;
    cardLayout?: 'default' | 'part5';
    showSubmitButton?: boolean;
    onSubmitTest?: () => void;
    onAnswer: (questionId: string, answer: AnswerOption) => void;
    onFlag: (questionId: string) => void;
    isSubmitPending?: boolean;
}

export const QuestionSection = ({
    questions,
    nextPart,
    onNextPart,
    cardLayout = 'default',
    showSubmitButton = false,
    onSubmitTest,
    onAnswer,
    onFlag,
    isSubmitPending = false,
}: Props) => {
    if (questions.length === 0) return null;

    return (
        <div className={styles.section}>
            {questions.map((question) => (
                <QuestionCard
                    key={question.id}
                    question={question}
                    onAnswer={onAnswer}
                    onFlag={onFlag}
                    layout={cardLayout}
                />
            ))}
            {(nextPart || showSubmitButton) && (
                <div className={styles.footer}>
                    <Button
                        type="button"
                        variant="primary"
                        padding="B"
                        disabled={isSubmitPending}
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
