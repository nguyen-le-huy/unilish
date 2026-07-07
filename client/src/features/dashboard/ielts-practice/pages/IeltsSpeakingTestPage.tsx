/* ──────────────────────────────────────────────────────────────
 * IeltsSpeakingTestPage — AI Conversation player
 * Phase 5: Injects fixed scenario, microphone/upload/transcript
 * NOTE: Full AI Voice integration is in roadmap (ADR-007)
 * ────────────────────────────────────────────────────────────── */

import { useParams } from 'react-router-dom';
import { useIeltsPlayer } from '../hooks/use-ielts-player';
import ExamShell from '../components/ExamShell/ExamShell';
import { SpeakingAiConversation } from '../components/renderers/SpeakingAiConversation';
import type { SpeakingDetailDto } from '../types/ielts-practice.types';

const IeltsSpeakingTestPage = () => {
  const { testId: slug } = useParams<{ testId: string }>();

  const {
    phase,
    attempt,
    testDetail,
    isLoading,
    error,
    saveState,
    submitAttempt,
    isSubmitting,
    submitError,
    answeredCount,
    totalCount,
  } = useIeltsPlayer({ slug });

  const detail = testDetail?.skill === 'speaking' ? (testDetail as SpeakingDetailDto) : null;

  if (isLoading || phase === 'initializing') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-ink-70">Đang chuẩn bị bài luyện nói…</p>
        </div>
      </div>
    );
  }

  if (error || phase === 'error') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-lg font-semibold mb-2">Không thể bắt đầu bài luyện</h2>
          <p className="text-sm text-ink-70">{error ?? 'Vui lòng thử lại sau.'}</p>
        </div>
      </div>
    );
  }

  if (!detail || !attempt) return null;

  return (
    <ExamShell
      skillName="Speaking"
      testTitle={detail.title}
      deadlineAt={attempt.deadlineAt}
      saveState={saveState}
      answeredCount={answeredCount}
      totalCount={totalCount}
      isSubmitting={isSubmitting}
      submitError={submitError}
      onSubmit={submitAttempt}
    >
      <SpeakingAiConversation
        detail={detail}
        disabled={phase === 'expired'}
      />
    </ExamShell>
  );
};

export default IeltsSpeakingTestPage;
