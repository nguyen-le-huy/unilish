/* ──────────────────────────────────────────────────────────────
 * SpeakingAiConversation — AI Conversation renderer
 * Phase 5: Injects fixed scenario, microphone/transcript flow
 * NOTE: Full implementation requires AI Voice integration (Phase 5+)
 * ────────────────────────────────────────────────────────────── */

import type { SpeakingDetailDto } from '../../types/ielts-practice.types';
import styles from './SpeakingAiConversation.module.css';

interface Props {
  detail: SpeakingDetailDto;
  disabled?: boolean;
}

export const SpeakingAiConversation = ({
  detail,
  disabled = false,
}: Props) => {
  const { content } = detail;

  return (
    <div className={styles.container}>
      <div className={styles.scenarioCard}>
        <span className={styles.badge}>Scenario</span>
        <h2 className={styles.title}>{content.scenarioTitle}</h2>
        <p className={styles.context}>{content.context}</p>

        <div className={styles.conversationStage}>
          <div className={styles.coachBubble}>
            <span className={styles.speakerLabel}>AI Coach</span>
            <p>{content.openingPrompt}</p>
          </div>

          <div className={styles.recorderArea}>
            {disabled ? (
              <p className={styles.disabledHint}>
                Bài luyện nói đã kết thúc.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.recordButton}
                  disabled
                  aria-label="Ghi âm"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="32" height="32">
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                  </svg>
                </button>
                <p className={styles.recordHint}>
                  Nhấn để ghi âm câu trả lời (tính năng đang được hoàn thiện)
                </p>
              </>
            )}
          </div>
        </div>

        <div className={styles.infoRow}>
          <span>⏱ {content.expectedDurationMinutes} phút</span>
          <span>🎤 {content.voice}</span>
        </div>
      </div>
    </div>
  );
};
