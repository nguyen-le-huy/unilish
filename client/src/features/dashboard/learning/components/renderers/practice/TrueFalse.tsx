import type { LearnerTrueFalseQuestion } from './practice.types';
import styles from './Practice.module.css';

interface TrueFalseProps {
    question: LearnerTrueFalseQuestion;
    value: boolean | null;
    onChange: (value: boolean) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
}

const TrueFalse = ({ question, value, onChange, feedback }: TrueFalseProps) => {
    return (
        <div className={styles.practiceQuestion}>
            {question.stem.text && <p className={styles.stem}>{question.stem.text}</p>}
            <div className={styles.options}>
                <button
                    type="button"
                    className={`${styles.option} ${value === true ? styles.optionSelected : ''}`}
                    onClick={() => !feedback && onChange(true)}
                    disabled={!!feedback}
                    aria-pressed={value === true}
                >
                    Đúng
                </button>
                <button
                    type="button"
                    className={`${styles.option} ${value === false ? styles.optionSelected : ''}`}
                    onClick={() => !feedback && onChange(false)}
                    disabled={!!feedback}
                    aria-pressed={value === false}
                >
                    Sai
                </button>
            </div>
            {feedback && (
                <p className={feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                    {feedback.explanation || (feedback.correct ? 'Đúng!' : 'Sai')}
                </p>
            )}
        </div>
    );
};

export default TrueFalse;
