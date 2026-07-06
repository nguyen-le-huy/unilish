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
                <div>
                    <span className={styles.eyebrow}>Bài làm của bạn</span>
                    <h2 className={styles.headerTitle}>Khu vực viết bài</h2>
                </div>
                <div className={styles.wordCount} aria-live="polite">
                    <strong>{wordCount}</strong>
                    <span>từ</span>
                </div>
            </header>

            <div className={styles.writingArea}>
                <label className={styles.editorLabel} htmlFor="placement-writing-essay">
                    Nội dung bài viết
                </label>
                <textarea
                    id="placement-writing-essay"
                    className={styles.textArea}
                    placeholder="Bắt đầu viết câu trả lời bằng tiếng Anh tại đây..."
                    value={essay}
                    disabled={isTextareaDisabled}
                    onChange={(event) => onEssayChange(event.target.value)}
                />
                <p className={styles.editorHint}>Bài viết được lưu trong phiên làm bài hiện tại. Hãy dành thời gian kiểm tra chính tả trước khi nộp.</p>
            </div>

            <footer className={styles.footer}>
                <div className={styles.timeBlock}>
                    <span className={styles.clockIcon} aria-hidden="true" />
                    <div>
                        <p className={styles.timeLabel}>Thời gian còn lại</p>
                        <p className={styles.timeValue}>{timeLabel}</p>
                    </div>
                    {hasTimedOut && <p className={styles.timeoutText}>Quá thời gian chờ chấm điểm. Vui lòng nộp lại.</p>}
                </div>

                <Button
                    className={styles.submitButton}
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
