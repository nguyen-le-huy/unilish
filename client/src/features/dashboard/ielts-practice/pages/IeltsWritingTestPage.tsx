/* ──────────────────────────────────────────────────────────────
 * IeltsWritingTestPage — Academic Task 1 Chart player
 * Phase 5: Bind prompt/image/minWords, server autosave
 * ────────────────────────────────────────────────────────────── */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useIeltsPlayer } from '../hooks/use-ielts-player';
import ExamShell from '../components/ExamShell/ExamShell';
import ConflictDialog from '../components/ConflictDialog/ConflictDialog';
import { WritingTaskOneChart } from '../components/renderers/WritingTaskOneChart';
import type { WritingDetailDto } from '../types/ielts-practice.types';

const WritingProgress = ({
  wordCount,
  minWords,
}: {
  wordCount: number;
  minWords: number;
}) => (
  <div style={{ padding: '1rem' }}>
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span>Tiến độ bài làm</span>
        <strong>{wordCount} từ</strong>
      </div>
      <div style={{ height: '0.5rem', background: '#e5e5e5', borderRadius: '999px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (wordCount / minWords) * 100)}%`,
            background: wordCount >= minWords ? '#2e7d32' : '#d97706',
            borderRadius: '999px',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
    <div style={{ background: '#f5f5f5', borderRadius: '0.5rem', padding: '0.75rem' }}>
      <p style={{ margin: '0 0 0.375rem', fontWeight: 600, fontSize: '0.8125rem' }}>Gợi ý</p>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: '#666', lineHeight: 1.5 }}>
        Dành vài phút để xác định đặc điểm nổi bật, sau đó nhóm và so sánh các số liệu quan trọng.
      </p>
    </div>
  </div>
);

const IeltsWritingTestPage = () => {
  const { testId: slug } = useParams<{ testId: string }>();

  const {
    phase,
    attempt,
    testDetail,
    isLoading,
    error,
    saveState,
    conflictData,
    clearConflict,
    submitAttempt,
    isSubmitting,
    submitError,
    essay,
    answeredCount,
    wordCount,
    minWords,
    updateEssay,
  } = useIeltsPlayer({ slug });

  const detail = testDetail?.skill === 'writing' ? (testDetail as WritingDetailDto) : null;

  const handleEssayChange = useCallback(
    (value: string) => {
      updateEssay(value);
    },
    [updateEssay],
  );

  if (isLoading || phase === 'initializing') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-ink-70">Đang chuẩn bị bài luyện…</p>
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
    <>
      <ExamShell
        skillName="Writing"
        testTitle={detail.title}
        deadlineAt={attempt.deadlineAt}
        saveState={saveState}
        answeredCount={answeredCount}
        totalCount={1}
        wordCount={wordCount}
        minWords={minWords}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={submitAttempt}
        aside={
          <WritingProgress
            wordCount={wordCount ?? 0}
            minWords={minWords ?? 150}
          />
        }
      >
        <WritingTaskOneChart
          detail={detail}
          essay={essay}
          onEssayChange={handleEssayChange}
          disabled={phase === 'expired'}
        />
      </ExamShell>

      <ConflictDialog
        open={conflictData !== null}
        latestRevision={conflictData?.latestRevision ?? 0}
        savedAt={conflictData?.savedAt ?? ''}
        onUseLocal={clearConflict}
        onUseServer={clearConflict}
      />
    </>
  );
};

export default IeltsWritingTestPage;
