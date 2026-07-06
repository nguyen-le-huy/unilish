import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/core/Button';
import { AudioPlayer } from './audio-player';
import { Part3QuestionSection } from './part3-question-section';
import { QuestionSection } from './question-section';
import styles from './left-panel.module.css';
import type { AnswerOption, ToeicQuestion, ToeicQuestionGroup, ToeicPart } from './types';

interface Props {
    activePart?: ToeicPart;
    onPartSelect?: (part: ToeicPart) => void;
    availableParts?: ToeicPart[];
    audioSrc?: string;
    questions?: ToeicQuestion[];
    questionGroups?: ToeicQuestionGroup[];
    nextPart?: ToeicPart;
    onAnswer: (questionId: string, answer: AnswerOption) => void;
    onFlag: (questionId: string) => void;
    onSubmitTest?: () => void;
    isSubmitPending?: boolean;
}

const PART_OPTIONS: ToeicPart[] = [1, 2, 3, 4, 5, 6, 7];

export const LeftPanel = ({
    activePart = 1,
    onPartSelect,
    availableParts = PART_OPTIONS,
    audioSrc,
    questions = [],
    questionGroups = [],
    nextPart,
    onAnswer,
    onFlag,
    onSubmitTest,
    isSubmitPending = false,
}: Props) => {
    const leftRef = useRef<HTMLDivElement>(null);
    const availablePartsSet = useMemo(() => new Set(availableParts), [availableParts]);
    const isGroupedPart = activePart === 3 || activePart === 4 || activePart === 5 || activePart === 6 || activePart === 7;
    const isLastPart = !nextPart;
    const effectiveGroups = activePart === 5
        ? questions.map((question) => ({
            id: `p5-${question.id}`,
            questions: [question],
        }))
        : questionGroups;

    const scrollToTop = useCallback(() => {
        if (leftRef.current) leftRef.current.scrollTop = 0;
        const qs = leftRef.current?.querySelector<HTMLDivElement>(`.${styles.questionSection}`);
        if (qs) qs.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'auto' });
    }, []);

    const handlePartChange = useCallback((part: ToeicPart) => {
        if (!availablePartsSet.has(part)) {
            return;
        }
        onPartSelect?.(part);
        // Trigger immediately on click, not only after re-render.
        scrollToTop();
        requestAnimationFrame(scrollToTop);
    }, [availablePartsSet, onPartSelect, scrollToTop]);

    useEffect(() => {
        // Fallback to ensure reset even if layout updates asynchronously.
        scrollToTop();
    }, [activePart, scrollToTop]);

    return (
        <div ref={leftRef} className={styles.left}>
            <div className={styles.partSelection} role="tablist" aria-label="Chon part TOEIC">
                {PART_OPTIONS.map((part) => {
                    const isActive = activePart === part;
                    const isDisabled = !availablePartsSet.has(part);

                    return (
                        <Button
                            key={part}
                            type="button"
                            variant={isActive ? 'primary' : 'outline'}
                            className={`${styles.partButton} ${isDisabled ? styles.partButtonDisabled : ''}`.trim()}
                            role="tab"
                            padding="B"
                            aria-selected={isActive}
                            aria-disabled={isDisabled}
                            aria-label={`Part ${part}`}
                            disabled={isDisabled}
                            onClick={() => handlePartChange(part)}
                        >
                            Part {part}
                        </Button>
                    );
                })}
            </div>
            {audioSrc && (
                <div className={styles.audioSection} aria-label="Audio player">
                    <AudioPlayer src={audioSrc} autoPlayOnChange playTrigger={activePart} />
                </div>
            )}
            <div className={styles.questionSection} aria-label="Questions">
                {isGroupedPart ? (
                    <Part3QuestionSection
                        key={`group-${activePart}`}
                        groups={effectiveGroups}
                        nextPart={nextPart}
                        onNextPart={handlePartChange}
                        showSubmitButton={isLastPart}
                        onAnswer={onAnswer}
                        onFlag={onFlag}
                        onSubmitTest={onSubmitTest}
                        isSubmitPending={isSubmitPending}
                    />
                ) : (
                    <QuestionSection
                        key={`single-${activePart}`}
                        questions={questions}
                        nextPart={nextPart}
                        onNextPart={handlePartChange}
                        cardLayout="default"
                        showSubmitButton={isLastPart}
                        onAnswer={onAnswer}
                        onFlag={onFlag}
                        onSubmitTest={onSubmitTest}
                        isSubmitPending={isSubmitPending}
                    />
                )}
            </div>
        </div>
    );
};
