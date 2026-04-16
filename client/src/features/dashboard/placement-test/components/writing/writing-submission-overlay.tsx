import { SubmissionSuccessCard } from '@/components/core/SubmissionSuccessCard';
import styles from './writing-submission-overlay.module.css';

interface WritingStatItem {
    label: string;
    value: string | number;
}

interface WritingSubmissionOverlayProps {
    description: string;
    stats: WritingStatItem[];
    continueLabel: string;
    onContinue: () => void;
}

export const WritingSubmissionOverlay = ({
    description,
    stats,
    continueLabel,
    onContinue,
}: WritingSubmissionOverlayProps) => {
    return (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <SubmissionSuccessCard
                description={description}
                stats={stats}
                continueLabel={continueLabel}
                onContinue={onContinue}
            />
        </div>
    );
};
