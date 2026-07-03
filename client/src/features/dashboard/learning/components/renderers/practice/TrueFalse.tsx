import type { LearnerTrueFalseQuestion } from './practice.types';
import StemMedia from './StemMedia';
import styles from './Practice.module.css';

interface TrueFalseProps {
    question: LearnerTrueFalseQuestion;
    value: boolean | null;
    onChange: (value: boolean) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
    typeLabel?: string;
}

const TrueFalse = ({ question, value, onChange, feedback, typeLabel }: TrueFalseProps) => {
    return (
        <div className={styles.practiceQuestion} data-question-heading>
            {typeLabel && <span className={styles.typeBadge}>{typeLabel}</span>}
            <StemMedia stem={question.stem} />
            <div className={styles.options} role="radiogroup" aria-label={typeLabel || 'Đúng/Sai'}>
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === true}
                    className={`${styles.option} ${value === true ? styles.optionSelected : ''}`}
                    onClick={() => !feedback && onChange(true)}
                    disabled={!!feedback}
                >
                    Đúng
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={value === false}
                    className={`${styles.option} ${value === false ? styles.optionSelected : ''}`}
                    onClick={() => !feedback && onChange(false)}
                    disabled={!!feedback}
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
