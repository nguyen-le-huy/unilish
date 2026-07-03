import type { LearnerMCQuestion } from './practice.types';
import StemMedia from './StemMedia';
import styles from './Practice.module.css';

interface MultipleChoiceProps {
    question: LearnerMCQuestion;
    selectedId: string | null;
    onSelect: (id: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
    typeLabel?: string;
}

const MultipleChoice = ({ question, selectedId, onSelect, feedback, typeLabel }: MultipleChoiceProps) => {
    return (
        <div className={styles.practiceQuestion} data-question-heading>
            {typeLabel && <span className={styles.typeBadge}>{typeLabel}</span>}
            <StemMedia stem={question.stem} />
            <div className={styles.options} role="radiogroup" aria-label={typeLabel || 'Chọn đáp án'}>
                {question.options.map((option) => {
                    const isSelected = selectedId === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                            onClick={() => !feedback && onSelect(option.id)}
                            disabled={!!feedback}
                        >
                            {option.text}
                        </button>
                    );
                })}
            </div>
            {feedback && (
                <p className={feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                    {feedback.explanation || (feedback.correct ? 'Đúng!' : 'Sai')}
                </p>
            )}
        </div>
    );
};

export default MultipleChoice;
