/* ──────────────────────────────────────────────────────────────
 * ReadingTrueFalseNotGiven — True/False/Not Given renderer
 * FR-10: Bind passage/statements, answer draft
 * ADR-001: Only TFNG, no Note Completion in MVP
 * ────────────────────────────────────────────────────────────── */

import type { ReadingDetailDto } from '../../types/ielts-practice.types';
import styles from './ReadingTrueFalseNotGiven.module.css';

interface Props {
  detail: ReadingDetailDto;
  answers: Record<string, string>;
  flaggedIds: string[];
  onAnswerChange: (id: string, value: string) => void;
  onFlagToggle: (id: string) => void;
  disabled?: boolean;
}

const CHOICES = ['TRUE', 'FALSE', 'NOT GIVEN'] as const;

export const ReadingTrueFalseNotGiven = ({
  detail,
  answers,
  flaggedIds,
  onAnswerChange,
  onFlagToggle,
  disabled = false,
}: Props) => {
  const { content } = detail;

  return (
    <div className={styles.container}>
      {/* ── Passage pane ─────────────────────────────── */}
      <article className={styles.passage}>
        <h2 className={styles.passageTitle}>{content.title || 'Reading Passage'}</h2>
        <div className={styles.passageText}>
          {content.passage.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </div>
      </article>

      {/* ── Statements pane ──────────────────────────── */}
      <section className={styles.questions}>
        <p className={styles.instruction}>{content.instruction}</p>

        <div className={styles.statementList}>
          {content.statements.map((stmt) => {
            const answer = answers[stmt.id] ?? '';
            const flagged = flaggedIds.includes(stmt.id);
            return (
              <div key={stmt.id} className={styles.statementCard} id={`question-${stmt.id}`}>
                <div className={styles.statementHeader}>
                  <span className={styles.number}>{stmt.order}</span>
                  <button
                    type="button"
                    className={flagged ? styles.flagActive : styles.flag}
                    onClick={() => onFlagToggle(stmt.id)}
                    aria-label={`Đánh dấu câu ${stmt.order}`}
                    disabled={disabled}
                  >
                    ⚑ Đánh dấu
                  </button>
                </div>
                <p className={styles.statementText}>{stmt.text}</p>
                <fieldset className={styles.choices} aria-label={`Lựa chọn cho câu ${stmt.order}: TRUE, FALSE, or NOT GIVEN`}>
                  <legend style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Câu {stmt.order}</legend>
                  {CHOICES.map((choice) => {
                    const val = choice === 'NOT GIVEN' ? 'NOT_GIVEN' : choice;
                    return (
                      <label
                        key={choice}
                        className={
                          answer === val ? styles.choiceSelected : styles.choice
                        }
                      >
                        <input
                          type="radio"
                          name={`reading-${stmt.id}`}
                          value={val}
                          checked={answer === val}
                          onChange={() => onAnswerChange(stmt.id, val)}
                          disabled={disabled}
                        />
                        {choice}
                      </label>
                    );
                  })}
                </fieldset>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
