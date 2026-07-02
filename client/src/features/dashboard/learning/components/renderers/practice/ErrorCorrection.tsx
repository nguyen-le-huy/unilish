import type { LearnerErrorCorrectionQuestion } from './practice.types';
import styles from './Practice.module.css';

interface ErrorCorrectionProps {
    question: LearnerErrorCorrectionQuestion;
    value: string;
    onChange: (value: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
}

const ErrorCorrection = ({ question, value, onChange, feedback }: ErrorCorrectionProps) => {
    return (
        <div className={styles.practiceQuestion}>
            <p className={styles.stem}>Tìm và sửa lỗi trong câu sau:</p>
            <p className={styles.errorText}>{question.stem.text}</p>
            <input
                type="text"
                className={`${styles.input} ${feedback ? (feedback.correct ? styles.inputCorrect : styles.inputIncorrect) : ''}`}
                value={value}
                onChange={(e) => !feedback && onChange(e.target.value)}
                disabled={!!feedback}
                placeholder="Nhập câu đã sửa..."
                aria-label="Câu đã sửa"
            />
            {feedback && (
                <p className={feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                    {feedback.explanation || (feedback.correct ? 'Đúng!' : 'Sai')}
                </p>
            )}
        </div>
    );
};

export default ErrorCorrection;
