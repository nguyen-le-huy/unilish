/* ──────────────────────────────────────────────────────────────
 * IeltsListeningTestPage — Form Completion player
 * Phase 5: Binds audio/items, answer draft, attempt engine
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useIeltsPlayer } from '../hooks/use-ielts-player';
import ExamShell from '../components/ExamShell/ExamShell';
import ConflictDialog from '../components/ConflictDialog/ConflictDialog';
import { ListeningFormCompletion } from '../components/renderers/ListeningFormCompletion';
import type { ListeningDetailDto } from '../types/ielts-practice.types';

const asideStyles: Record<string, React.CSSProperties> = {
  panel: { padding: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.375rem', marginBottom: '0.75rem' },
  numBtn: { width: '100%', aspectRatio: '1', border: '1px solid #e5e5e5', borderRadius: '0.375rem', background: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 },
  numAnswered: { background: '#e8f5e9', borderColor: '#2e7d32', color: '#2e7d32' },
  numFlagged: { borderColor: '#d97706' },
  legend: { display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem', color: '#666' },
};

const ListeningProgress = ({
  answers,
  items,
  flaggedIds,
  onNavigate,
}: {
  answers: Record<string, string>;
  items: Array<{ id: string; order: number }>;
  flaggedIds: string[];
  onNavigate: (id: string) => void;
}) => {
  const answered = Object.values(answers).filter((v) => v.trim()).length;
  const total = items.length;
  return (
    <div style={asideStyles.panel}>
      <div style={asideStyles.header}>
        <span>Tiến độ</span>
        <strong>{answered}/{total}</strong>
      </div>
      <div style={asideStyles.grid}>
        {items.map((item) => {
          const hasAnswer = !!answers[item.id]?.trim();
          const flagged = flaggedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              style={{
                ...asideStyles.numBtn,
                ...(hasAnswer ? asideStyles.numAnswered : {}),
                ...(flagged ? asideStyles.numFlagged : {}),
              }}
              onClick={() => onNavigate(item.id)}
              aria-label={`Câu ${item.order}${hasAnswer ? ', đã trả lời' : ''}${flagged ? ', đánh dấu' : ''}`}
            >
              {item.order}
            </button>
          );
        })}
      </div>
      <div style={asideStyles.legend}>
        <span>Đã trả lời ({answered})</span>
        <span>Chưa ({total - answered})</span>
        <span>Đánh dấu ({flaggedIds.length})</span>
      </div>
    </div>
  );
};

const IeltsListeningTestPage = () => {
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
    exitAttempt,
    isSubmitting,
    submitError,
    answers,
    flaggedIds,
    answeredCount,
    totalCount,
    updateAnswers,
    updateFlagged,
  } = useIeltsPlayer({ slug });

  const detail = testDetail?.skill === 'listening' ? (testDetail as ListeningDetailDto) : null;
  const items = detail?.content.items ?? [];

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
      <ListeningProgress
        answers={answers}
        items={items}
        flaggedIds={flaggedIds}
        onNavigate={handleNavigate}
      />
    ),
    [answers, items, flaggedIds, handleNavigate],
  );

  // ── Loading state ─────────────────────────────────────
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

  // ── Error state ───────────────────────────────────────
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
        skillName="Listening"
        testTitle={detail.title}
        deadlineAt={attempt.deadlineAt}
        saveState={saveState}
        answeredCount={answeredCount}
        totalCount={totalCount}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={submitAttempt}
        onExit={exitAttempt}
        aside={aside}
      >
        <ListeningFormCompletion
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

export default IeltsListeningTestPage;
