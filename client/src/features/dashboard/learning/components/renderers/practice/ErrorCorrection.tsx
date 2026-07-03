import type { LearnerErrorCorrectionQuestion } from './practice.types';
import StemMedia from './StemMedia';
import styles from './Practice.module.css';

interface ErrorCorrectionProps {
    question: LearnerErrorCorrectionQuestion;
    value: string;
    onChange: (value: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
    typeLabel?: string;
}

const ErrorCorrection = ({ question, value, onChange, feedback, typeLabel }: ErrorCorrectionProps) => {
    return (
        <div className={styles.practiceQuestion} data-question-heading>
            {typeLabel && <span className={styles.typeBadge}>{typeLabel}</span>}
            <p className={styles.stem}>Tìm và sửa lỗi trong câu sau:</p>
            <p className={styles.errorText}>{question.stem.text}</p>
            <StemMedia stem={question.stem} showText={false} />
            <label className={styles.inputLabel} htmlFor={`ec-${question.id}`}>
                Viết lại câu đúng
            </label>
            <textarea
                id={`ec-${question.id}`}
                className={`${styles.textarea} ${feedback ? (feedback.correct ? styles.inputCorrect : styles.inputIncorrect) : ''}`}
                value={value}
                onChange={(e) => !feedback && onChange(e.target.value)}
                disabled={!!feedback}
                placeholder="Viết lại câu đúng..."
                rows={3}
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
