/* ──────────────────────────────────────────────────────────────
 * SubmitDialog — Confirmation modal before submitting attempt
 * ────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import styles from './SubmitDialog.module.css';

interface SubmitDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** How many items the learner has answered */
  answeredCount: number;
  /** Total number of items */
  totalCount: number;
  /** For Writing: word count */
  wordCount?: number;
  /** Minimum word count requirement (Writing) */
  minWords?: number;
  /** Submission in progress */
  isSubmitting?: boolean;
  /** Error message */
  error?: string | null;
}

const SubmitDialog = ({
  open,
  onClose,
  onConfirm,
  answeredCount,
  totalCount,
  wordCount,
  minWords,
  isSubmitting = false,
  error = null,
}: SubmitDialogProps) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Focus confirm button when dialog opens
      window.setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  const hasAllQuestions = answeredCount >= totalCount;
  const belowWordCount = wordCount !== undefined && minWords !== undefined && wordCount < minWords;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (!isSubmitting && e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-dialog-title"
      >
        <span className={styles.icon} aria-hidden="true">
          {hasAllQuestions ? '✓' : '?'}
        </span>
        <h2 id="submit-dialog-title">Xác nhận nộp bài?</h2>

        <div className={styles.summary}>
          {wordCount !== undefined ? (
            <p>
              Bài viết{' '}
              <strong>
                {wordCount} từ
              </strong>
              {minWords !== undefined && (
                <> (tối thiểu {minWords} từ)</>
              )}
              .
            </p>
          ) : (
            <p>
              Bạn đã trả lời{' '}
              <strong>
                {answeredCount}/{totalCount} câu
              </strong>
              .
            </p>
          )}
          <p>Sau khi nộp, bạn sẽ không thể thay đổi đáp án.</p>
        </div>

        {belowWordCount && (
          <div className={styles.warning} role="alert">
            Bài viết chưa đạt số từ tối thiểu ({wordCount}/{minWords}).
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Tiếp tục làm bài
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang nộp…' : 'Nộp bài ngay'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SubmitDialog;
