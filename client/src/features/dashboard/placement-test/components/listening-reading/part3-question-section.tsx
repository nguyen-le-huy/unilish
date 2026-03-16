import { Button } from '@/components/core/Button';
import { QuestionCard } from './question-card';
import styles from './part3-question-section.module.css';
import type { AnswerOption, ToeicPart, ToeicQuestionGroup } from './types';

interface Props {
    groups: ToeicQuestionGroup[];
    nextPart?: ToeicPart;
    onNextPart?: (part: ToeicPart) => void;
    showSubmitButton?: boolean;
    onSubmitTest?: () => void;
    onAnswer: (questionId: string, answer: AnswerOption) => void;
    onFlag: (questionId: string) => void;
    isSubmitPending?: boolean;
}

export const Part3QuestionSection = ({
    groups,
    nextPart,
    onNextPart,
    showSubmitButton = false,
    onSubmitTest,
    onAnswer,
    onFlag,
    isSubmitPending = false,
}: Props) => {
    if (groups.length === 0) return null;

    return (
        <div className={styles.section}>
            {groups.map((group) => {
                const images = group.imageUrls && group.imageUrls.length > 0
                    ? group.imageUrls
                    : (group.imageUrl ? [group.imageUrl] : []);
                const hasImage = images.length > 0;

                return (
                    <div key={group.id} className={`${styles.group} ${!hasImage ? styles.groupNoImage : ''}`}>
                        {hasImage && (
                            <div className={`${styles.groupImageWrap} ${images.length > 1 ? styles.groupImageGrid : ''}`}>
                                {images.map((imageUrl, idx) => (
                                    <img
                                        key={`${group.id}-img-${idx}`}
                                        src={imageUrl}
                                        alt={`Group illustration ${idx + 1}`}
                                        className={styles.groupImage}
                                    />
                                ))}
                            </div>
                        )}

                        <div className={styles.questionsWrap}>
                            {group.questions.map((question) => (
                                <QuestionCard
                                    key={question.id}
                                    question={question}
                                    onAnswer={onAnswer}
                                    onFlag={onFlag}
                                    layout="grouped"
                                    divider={false}
                                    hideImage={hasImage}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}

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
