import { useCallback } from 'react';
import type { LearnerFillQuestion } from './practice.types';
import StemMedia from './StemMedia';
import styles from './Practice.module.css';

interface FillInBlankProps {
    question: LearnerFillQuestion;
    value: string;
    onChange: (value: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
    typeLabel?: string;
    onEnter?: () => void;
}

const FillInBlank = ({ question, value, onChange, feedback, typeLabel, onEnter }: FillInBlankProps) => {
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && value.trim().length > 0 && onEnter) {
            onEnter();
        }
    }, [value, onEnter]);

    return (
        <div className={styles.practiceQuestion} data-question-heading>
            {typeLabel && <span className={styles.typeBadge}>{typeLabel}</span>}
            <StemMedia stem={question.stem} />
            <input
                type="text"
                className={`${styles.input} ${feedback ? (feedback.correct ? styles.inputCorrect : styles.inputIncorrect) : ''}`}
                value={value}
                onChange={(e) => !feedback && onChange(e.target.value)}
                onKeyDown={!feedback ? handleKeyDown : undefined}
                disabled={!!feedback}
                placeholder="Nhập câu trả lời..."
                aria-label={typeLabel || 'Câu trả lời'}
                autoComplete="off"
            />
            {feedback && (
                <p className={feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                    {feedback.explanation || (feedback.correct ? 'Đúng!' : 'Sai')}
                </p>
            )}
        </div>
    );
};

export default FillInBlank;
