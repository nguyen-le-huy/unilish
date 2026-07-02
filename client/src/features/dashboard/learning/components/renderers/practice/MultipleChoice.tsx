import type { LearnerMCQuestion } from './practice.types';
import styles from './Practice.module.css';

interface MultipleChoiceProps {
    question: LearnerMCQuestion;
    selectedId: string | null;
    onSelect: (id: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
}

const MultipleChoice = ({ question, selectedId, onSelect, feedback }: MultipleChoiceProps) => {
    return (
        <div className={styles.practiceQuestion}>
            {question.stem.text && <p className={styles.stem}>{question.stem.text}</p>}
            <div className={styles.options}>
                {question.options.map((option) => {
                    const isSelected = selectedId === option.id;
                    return (
                        <button
                            key={option.id}
                            type="button"
                            className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                            onClick={() => !feedback && onSelect(option.id)}
                            disabled={!!feedback}
                            aria-pressed={isSelected}
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
