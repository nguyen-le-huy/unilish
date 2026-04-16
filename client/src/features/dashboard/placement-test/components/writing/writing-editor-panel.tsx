import { Button } from '@/components/core/Button';
import styles from './writing-editor-panel.module.css';

interface WritingEditorPanelProps {
    essay: string;
    wordCount: number;
    timeLabel: string;
    hasTimedOut: boolean;
    isTextareaDisabled: boolean;
    canManualSubmit: boolean;
    submitButtonLabel: string;
    onEssayChange: (value: string) => void;
    onSubmit: () => void;
}

export const WritingEditorPanel = ({
    essay,
    wordCount,
    timeLabel,
    hasTimedOut,
    isTextareaDisabled,
    canManualSubmit,
    submitButtonLabel,
    onEssayChange,
    onSubmit,
}: WritingEditorPanelProps) => {
    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <p className={styles.headerTitle}>Khu vực viết bài</p>
                <p className={styles.wordCount}>Word count: {wordCount}</p>
            </header>

            <div className={styles.writingArea}>
                <textarea
                    className={styles.textArea}
                    placeholder="Nhập phần viết của bạn ở đây."
                    value={essay}
                    disabled={isTextareaDisabled}
                    onChange={(event) => onEssayChange(event.target.value)}
                />
            </div>

            <footer className={styles.footer}>
                <div className={styles.timeBlock}>
                    <p className={styles.timeLabel}>Thời gian còn lại:</p>
                    <p className={styles.timeValue}>{timeLabel}</p>
                    {hasTimedOut && <p className={styles.timeoutText}>Quá thời gian chờ chấm điểm. Vui lòng nộp lại.</p>}
                </div>

                <Button
                    type="button"
                    variant="primary"
                    disabled={!canManualSubmit}
                    onClick={onSubmit}
                >
                    {submitButtonLabel}
                </Button>
            </footer>
        </section>
    );
};