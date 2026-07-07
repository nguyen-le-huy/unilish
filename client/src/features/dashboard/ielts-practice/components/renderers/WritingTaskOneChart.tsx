/* ──────────────────────────────────────────────────────────────
 * WritingTaskOneChart — Academic Task 1 Chart renderer
 * FR-10: Bind prompt/image/minWords, server autosave
 * ────────────────────────────────────────────────────────────── */

import { useCallback } from 'react';
import type { WritingDetailDto } from '../../types/ielts-practice.types';
import styles from './WritingTaskOneChart.module.css';

interface Props {
  detail: WritingDetailDto;
  essay: string;
  onEssayChange: (value: string) => void;
  disabled?: boolean;
  saveState?: string;
}

const countWords = (value: string) =>
  value.trim() ? value.trim().split(/\s+/).length : 0;

export const WritingTaskOneChart = ({
  detail,
  essay,
  onEssayChange,
  disabled = false,
}: Props) => {
  const { content } = detail;
  const words = countWords(essay);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onEssayChange(e.target.value);
    },
    [onEssayChange],
  );

  return (
    <div className={styles.container}>
      {/* ── Prompt pane ──────────────────────────────── */}
      <section className={styles.promptPane}>
        <div className={styles.promptHeader}>
          <span>Academic Writing</span>
        </div>
        <div className={styles.promptContent}>
          <p className={styles.timing}>You should spend about 20 minutes on this task.</p>
          <h1 className={styles.prompt}>{content.prompt}</h1>
          {content.image.url && (
            <figure className={styles.chartFigure}>
              <img src={content.image.url} alt={content.image.alt} />
            </figure>
          )}
          <p className={styles.instruction}>{content.instruction}</p>
          <p className={styles.minWords}>Write at least <strong>{content.minWords} words</strong>.</p>
        </div>
      </section>

      {/* ── Editor pane ───────────────────────────────── */}
      <section className={styles.editorPane}>
        <div className={styles.editorHeader}>
          <span>Bài viết của bạn</span>
        </div>
        <textarea
          className={styles.editor}
          value={essay}
          onChange={handleChange}
          placeholder="Bắt đầu viết câu trả lời tại đây…"
          spellCheck
          aria-label="Bài viết IELTS Writing"
          disabled={disabled}
        />
        <footer className={styles.editorFooter}>
          <span className={words >= content.minWords ? styles.wordCountOk : styles.wordCount}>
            <strong>{words}</strong> từ
          </span>
          <span>Mục tiêu tối thiểu: {content.minWords} từ</span>
        </footer>
      </section>
    </div>
  );
};
