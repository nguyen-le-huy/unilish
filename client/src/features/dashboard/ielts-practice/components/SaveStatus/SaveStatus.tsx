/* ──────────────────────────────────────────────────────────────
 * SaveStatus — Displays autosave state
 * ────────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState } from 'react';
import styles from './SaveStatus.module.css';

export type SaveState = 'saving' | 'saved' | 'unsynced' | 'conflict' | 'idle';

interface SaveStatusProps {
  state: SaveState;
  savedAt?: string;
  /** Accessibility: announce changes to screen readers */
  announce?: boolean;
}

const STATE_LABELS: Record<SaveState, string> = {
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  unsynced: 'Chưa đồng bộ',
  conflict: 'Xung đột',
  idle: '',
};

const SaveStatus = ({ state, savedAt, announce = true }: SaveStatusProps) => {
  const [liveMessage, setLiveMessage] = useState('');
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (state === 'saved' && announce && prevStateRef.current !== 'saved') {
      setLiveMessage('Bài làm đã được lưu');
      const timer = window.setTimeout(() => setLiveMessage(''), 3000);
      prevStateRef.current = state;
      return () => window.clearTimeout(timer);
    }
    prevStateRef.current = state;
  }, [state, savedAt, announce]);

  if (state === 'idle' || state === 'unsynced' || state === 'saved') return null;

  return (
    <span
      className={`${styles.saveStatus} ${styles[state]}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {state === 'saving' && <span className={styles.spinner} aria-hidden="true" />}
      {state === 'conflict' && <span className={styles.conflictIcon} aria-hidden="true">!</span>}
      <span>{STATE_LABELS[state]}</span>
      {liveMessage && (
        <span className="sr-only" aria-live="polite">
          {liveMessage}
        </span>
      )}
    </span>
  );
};

export default SaveStatus;
