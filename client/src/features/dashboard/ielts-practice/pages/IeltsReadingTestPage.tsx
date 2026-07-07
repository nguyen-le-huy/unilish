/* ──────────────────────────────────────────────────────────────
 * IeltsReadingTestPage — True/False/Not Given player
 * Phase 5: Bind passage/statements, answer draft
 * ADR-001: Only TFNG — Note Completion removed per spec
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useIeltsPlayer } from '../hooks/use-ielts-player';
import ExamShell from '../components/ExamShell/ExamShell';
import ConflictDialog from '../components/ConflictDialog/ConflictDialog';
import { ReadingTrueFalseNotGiven } from '../components/renderers/ReadingTrueFalseNotGiven';
import type { ReadingDetailDto } from '../types/ielts-practice.types';

const ReadingProgress = ({
  answers,
  statements,
  flaggedIds,
  onNavigate,
}: {
  answers: Record<string, string>;
  statements: Array<{ id: string; order: number }>;
  flaggedIds: string[];
  onNavigate: (id: string) => void;
}) => {
  const answered = Object.values(answers).filter((v) => v.trim()).length;
  const total = statements.length;
  const gridCols = total <= 13 ? 5 : Math.min(8, Math.ceil(total / 3));

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span>Tiến độ</span>
        <strong>{answered}/{total}</strong>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '0.375rem', marginBottom: '0.75rem' }}>
        {statements.map((s) => {
          const hasAnswer = !!answers[s.id]?.trim();
          const flagged = flaggedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              style={{
                width: '100%', aspectRatio: '1', border: '1px solid #e5e5e5', borderRadius: '0.375rem',
                background: hasAnswer ? '#e8f5e9' : '#fff', borderColor: flagged ? '#d97706' : '#e5e5e5',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: hasAnswer ? '#2e7d32' : '#333',
              }}
              onClick={() => onNavigate(s.id)}
              aria-label={`Câu ${s.order}${hasAnswer ? ', đã trả lời' : ''}${flagged ? ', đánh dấu' : ''}`}
            >
              {s.order}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem', color: '#666' }}>
        <span>Đã trả lời ({answered})</span>
        <span>Chưa ({total - answered})</span>
        <span>Đánh dấu ({flaggedIds.length})</span>
      </div>
    </div>
  );
};

const IeltsReadingTestPage = () => {
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
    answers,
    flaggedIds,
    answeredCount,
    totalCount,
    updateAnswers,
    updateFlagged,
  } = useIeltsPlayer({ slug });

  const detail = testDetail?.skill === 'reading' ? (testDetail as ReadingDetailDto) : null;
  const statements = detail?.content.statements ?? [];

  const handleAnswerChange = useCallback(
    (id: string, value: string) => {
      updateAnswers({ ...answers, [id]: value });
    },
    [answers, updateAnswers],
  );

  const handleFlagToggle = useCallback(
    (id: string) => {
      const next = flaggedIds.includes(id)
        ? flaggedIds.filter((f: string) => f !== id)
        : [...flaggedIds, id];
      updateFlagged(next);
    },
    [flaggedIds, updateFlagged],
  );

  const handleNavigate = useCallback((id: string) => {
    document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const aside = useMemo(
    () => (
      <ReadingProgress
        answers={answers}
        statements={statements}
        flaggedIds={flaggedIds}
        onNavigate={handleNavigate}
      />
    ),
    [answers, statements, flaggedIds, handleNavigate],
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
        skillName="Reading"
        testTitle={detail.title}
        deadlineAt={attempt.deadlineAt}
        saveState={saveState}
        answeredCount={answeredCount}
        totalCount={totalCount}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={submitAttempt}
        aside={aside}
      >
        <ReadingTrueFalseNotGiven
          detail={detail}
          answers={answers}
          flaggedIds={flaggedIds}
          onAnswerChange={handleAnswerChange}
          onFlagToggle={handleFlagToggle}
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

export default IeltsReadingTestPage;
