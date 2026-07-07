/* ──────────────────────────────────────────────────────────────
 * ConflictDialog — Revision conflict resolution modal
 * FR-07 / AC-10: Shows server version, lets learner choose
 * ────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import styles from './ConflictDialog.module.css';

interface ConflictDialogProps {
  open: boolean;
  latestRevision: number;
  savedAt: string;
  onUseLocal: () => void;
  onUseServer: () => void;
}

const ConflictDialog = ({
  open,
  latestRevision,
  savedAt,
  onUseLocal,
  onUseServer,
}: ConflictDialogProps) => {
  const localBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => localBtnRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        onUseServer(); // Safe default
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onUseServer]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onUseServer();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
      >
        <span className={styles.icon} aria-hidden="true">!</span>
        <h2 id="conflict-dialog-title">Xung đột dữ liệu</h2>
        <p>
          Bài làm đã được cập nhật trên thiết bị khác.
          <br />
          <strong>Phiên bản server:</strong> v{latestRevision} ({new Date(savedAt).toLocaleString('vi-VN')})
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            ref={localBtnRef}
            className={styles.localButton}
            onClick={onUseLocal}
          >
            Giữ bản của tôi
          </button>
          <button
            type="button"
            className={styles.serverButton}
            onClick={onUseServer}
          >
            Tải bản mới nhất từ server
          </button>
        </div>
      </section>
    </div>
  );
};

export default ConflictDialog;
