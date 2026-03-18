import { Button } from '@/components/core/Button';
import successIcon from '@/assets/icons/ep_success-filled.svg';
import styles from './submission-success-card.module.css';

interface Props {
    completedMinutes: number | null;
    submittedQuestions: number;
    totalQuestions: number;
    onContinue: () => void;
    title?: string;
    description?: string;
    submittedLabel?: string;
    continueLabel?: string;
}

const formatCompletedMinutes = (minutes: number | null): string => {
    if (!minutes || Number.isNaN(minutes)) {
        return '--';
    }

    return `${minutes}p`;
};

export const SubmissionSuccessCard = ({
    completedMinutes,
    submittedQuestions,
    totalQuestions,
    onContinue,
    title = 'Nộp bài thành công',
    description = 'Bạn đã nộp thành công phần Listening và Reading.',
    submittedLabel = 'Số câu đã nộp',
    continueLabel = 'Quay về Dashboard',
}: Props) => {
    const descriptionLines = description.split('\n');

    return (
        <section className={styles.card} aria-live="polite">
            <img src={successIcon} alt="Nộp bài thành công" className={styles.icon} />

            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>
                {descriptionLines.map((line, index) => (
                    <span key={`${line}-${index}`}>
                        {line}
                        {index < descriptionLines.length - 1 ? <br /> : null}
                    </span>
                ))}
            </p>

            <div className={styles.stats}>
                <p>
                    Thời gian hoàn thành: <strong>{formatCompletedMinutes(completedMinutes)}</strong>
                </p>
                <p>
                    {submittedLabel}: <strong>{submittedQuestions}/{totalQuestions}</strong>
                </p>
            </div>

            <Button type="button" size="full" onClick={onContinue} className={styles.continueButton}>
                {continueLabel}
            </Button>
        </section>
    );
};