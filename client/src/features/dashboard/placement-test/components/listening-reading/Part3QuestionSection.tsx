import { useCallback, useState } from 'react';
import { Button } from '@/components/core/Button';
import { QuestionCard } from './QuestionCard';
import styles from './Part3QuestionSection.module.css';
import type { AnswerOption, ToeicPart, ToeicQuestionGroup } from './types';

interface Props {
    groups: ToeicQuestionGroup[];
    nextPart?: ToeicPart;
    onNextPart?: (part: ToeicPart) => void;
    showSubmitButton?: boolean;
    onSubmitTest?: () => void;
}

export const Part3QuestionSection = ({
    groups: initialGroups,
    nextPart,
    onNextPart,
    showSubmitButton = false,
    onSubmitTest,
}: Props) => {
    const [groups, setGroups] = useState<ToeicQuestionGroup[]>(initialGroups);

    const handleAnswer = useCallback((groupId: string, questionId: string, answer: AnswerOption) => {
        setGroups((prev) =>
            prev.map((group) =>
                group.id !== groupId
                    ? group
                    : {
                          ...group,
                          questions: group.questions.map((question) =>
                              question.id === questionId ? { ...question, selectedAnswer: answer } : question
                          ),
                      }
            )
        );
    }, []);

    const handleFlag = useCallback((groupId: string, questionId: string) => {
        setGroups((prev) =>
            prev.map((group) =>
                group.id !== groupId
                    ? group
                    : {
                          ...group,
                          questions: group.questions.map((question) =>
                              question.id === questionId ? { ...question, flagged: !question.flagged } : question
                          ),
                      }
            )
        );
    }, []);

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
                                    onAnswer={(questionId, answer) => handleAnswer(group.id, questionId, answer)}
                                    onFlag={(questionId) => handleFlag(group.id, questionId)}
                                    layout="grouped"
                                    divider={false}
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
