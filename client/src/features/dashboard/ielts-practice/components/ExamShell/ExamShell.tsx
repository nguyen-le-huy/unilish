/* ──────────────────────────────────────────────────────────────
 * ExamShell — Shared player layout with top bar, timer, save state
 * ────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import SaveStatus, { type SaveState } from '../SaveStatus/SaveStatus';
import SubmitDialog from '../SubmitDialog/SubmitDialog';
import styles from './ExamShell.module.css';

interface ExamShellProps {
  /** Skill name for display */
  skillName: string;
  /** Test title */
  testTitle: string;
  /** ISO deadline string from server */
  deadlineAt: string;
  /** Children: skill-specific content area */
  children: React.ReactNode;
  /** Right pane / aside (progress, navigation) */
  aside?: React.ReactNode;
  /** Save state management */
  saveState: SaveState;
  /** Answered count for submit dialog */
  answeredCount: number;
  /** Total items */
  totalCount: number;
  /** Word count (for Writing) */
  wordCount?: number;
  /** Min words (for Writing) */
  minWords?: number;
  /** Whether a submit is in progress */
  isSubmitting?: boolean;
  /** Submit error */
  submitError?: string | null;
  /** Called when user confirms submit */
  onSubmit: () => void;
  /** Called on exit / leave */
  onExit?: () => void;
  /** Back-to list URL */
  backUrl?: string;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ExamShell = ({
  skillName,
  testTitle,
  deadlineAt,
  children,
  aside,
  saveState,
  answeredCount,
  totalCount,
  wordCount,
  minWords,
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onExit,
  backUrl,
}: ExamShellProps) => {
  const navigate = useNavigate();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [expired, setExpired] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  // ─── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const deadline = new Date(deadlineAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) setExpired(true);
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  // ─── Announce time milestones ───────────────────────────────
  const [announcement, setAnnouncement] = useState('');
  const prevRemainingRef = useRef(remainingSeconds);
  useEffect(() => {
    const prev = prevRemainingRef.current;
    const shouldAnnounce = (prev !== remainingSeconds) && (
      remainingSeconds === 300 || remainingSeconds === 60 || remainingSeconds <= 0
    );
    if (shouldAnnounce) {
      const msg = remainingSeconds <= 0
        ? 'Hết giờ làm bài'
        : remainingSeconds === 60
          ? 'Còn 1 phút'
          : 'Còn 5 phút';
      setAnnouncement(msg);
      const t = window.setTimeout(() => setAnnouncement(''), 5000);
      prevRemainingRef.current = remainingSeconds;
      return () => window.clearTimeout(t);
    }
    prevRemainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  const handleExit = useCallback(() => {
    if (onExit) onExit();
    const skill = backUrl?.split('/').pop() ?? 'listening';
    navigate(backUrl ?? PATHS.DASHBOARD.IELTS_SKILL(skill));
  }, [navigate, onExit, backUrl]);

  const handleConfirmSubmit = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <main className={styles.examPage}>
      {/* ─── Top bar ──────────────────────────────────────── */}
      <header className={styles.topBar}>
        <div className={styles.brandBlock}>
          <span className={styles.breadcrumb}>
            IELTS {skillName}
          </span>
          <strong className={styles.testTitle}>{testTitle}</strong>
        </div>

        <div className={styles.centerBlock}>
          <div
            className={`${styles.timer} ${expired ? styles.timerExpired : ''}`}
            aria-label="Thời gian còn lại"
            role="timer"
            aria-live="off"
          >
            <span aria-hidden="true">◷</span>
            {formatTime(remainingSeconds)}
          </div>
          <SaveStatus state={saveState} />
        </div>

        {announcement && (
          <div className="sr-only" role="alert" aria-live="assertive">
            {announcement}
          </div>
        )}

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exitButton}
            onClick={handleExit}
            disabled={isSubmitting}
          >
            Thoát
          </button>
          <button
            type="button"
            className={styles.submitButton}
            onClick={() => setShowSubmit(true)}
            disabled={isSubmitting || expired}
          >
            Nộp bài
          </button>
        </div>
      </header>

      {/* ─── Workspace ────────────────────────────────────── */}
      <div className={styles.workspace}>
        <section className={styles.contentPane}>
          {children}
        </section>

        {aside && (
          <aside className={styles.asidePane}>
            {aside}
          </aside>
        )}
      </div>

      {/* ─── Submit dialog ────────────────────────────────── */}
      <SubmitDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onConfirm={handleConfirmSubmit}
        answeredCount={answeredCount}
        totalCount={totalCount}
        wordCount={wordCount}
        minWords={minWords}
        isSubmitting={isSubmitting}
        error={submitError}
      />

      {/* ─── Expired overlay ──────────────────────────────── */}
      {expired && (
        <div className={styles.expiredOverlay} role="alert">
          <div className={styles.expiredCard}>
            <span className={styles.expiredIcon}>⏰</span>
            <h2>Đã hết thời gian làm bài</h2>
            <p>Bạn không thể tiếp tục chỉnh sửa. Hãy nộp bài để xem kết quả.</p>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => setShowSubmit(true)}
            >
              Nộp bài
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default ExamShell;
