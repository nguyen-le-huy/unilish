import type { LearnerFillQuestion } from './practice.types';
import styles from './Practice.module.css';

interface FillInBlankProps {
    question: LearnerFillQuestion;
    value: string;
    onChange: (value: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
}

const FillInBlank = ({ question, value, onChange, feedback }: FillInBlankProps) => {
    return (
        <div className={styles.practiceQuestion}>
            {question.stem.text && <p className={styles.stem}>{question.stem.text}</p>}
            <input
                type="text"
                className={`${styles.input} ${feedback ? (feedback.correct ? styles.inputCorrect : styles.inputIncorrect) : ''}`}
                value={value}
                onChange={(e) => !feedback && onChange(e.target.value)}
                disabled={!!feedback}
                placeholder="Nhập câu trả lời..."
                aria-label="Câu trả lời"
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
