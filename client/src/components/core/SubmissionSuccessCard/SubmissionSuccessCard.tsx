import React from 'react';
import { Button } from '@/components/core/Button';
import successIcon from '@/assets/icons/ep_success-filled.svg';
import styles from './SubmissionSuccessCard.module.css';

interface StatItem {
    label: string;
    value: string | number;
}

interface SubmissionSuccessCardProps {
    /** Card title, e.g. "Nộp bài thành công" */
    title?: string;
    /** Description text. Use \n to break into multiple lines. */
    description?: string;
    /** An array of stat rows shown below the description, e.g. [{ label: 'Thời gian hoàn thành', value: '120p' }] */
    stats?: StatItem[];
    /** Label for the continue/action button */
    continueLabel?: string;
    /** Callback fired when the button is clicked */
    onContinue: () => void;
}

export const SubmissionSuccessCard: React.FC<SubmissionSuccessCardProps> = ({
    title = 'Nộp bài thành công',
    description = '',
    stats = [],
    continueLabel = 'Tiếp tục',
    onContinue,
}) => {
    const descriptionLines = description.split('\n');

    return (
        <section className={styles.card} aria-live="polite">
            <img
                src={successIcon}
                alt="Nộp bài thành công"
                className={styles.icon}
            />

            <h2 className={styles.title}>{title}</h2>

            {description && (
                <p className={styles.description}>
                    {descriptionLines.map((line, index) => (
                        <React.Fragment key={`${line}-${index}`}>
                            {line}
                            {index < descriptionLines.length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </p>
            )}

            {stats.length > 0 && (
                <div className={styles.stats}>
                    {stats.map((stat) => (
                        <p key={stat.label}>
                            {stat.label}: <strong>{stat.value}</strong>
                        </p>
                    ))}
                </div>
            )}

            <Button
                type="button"
                size="full"
                onClick={onContinue}
                className={styles.continueButton}
            >
                {continueLabel}
            </Button>
        </section>
    );
};
