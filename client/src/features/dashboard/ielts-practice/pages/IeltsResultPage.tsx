/* ──────────────────────────────────────────────────────────────
 * IeltsResultPage — Attempt result and item review
 * ────────────────────────────────────────────────────────────── */

import { Link, Navigate, useParams } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useAttempt, useAttemptResult } from '../hooks/use-ielts-attempt';
import {
  IELTS_SKILL_LABELS,
  type AiResult,
  type ObjectiveResult,
  type ObjectiveResultDetail,
} from '../types/ielts-practice.types';
import styles from './IeltsResultPage.module.css';

const STATUS_LABELS: Record<string, string> = {
  graded: 'Đã chấm điểm',
  pending_grading: 'Đang chấm điểm',
  submitted: 'Đã nộp bài',
  expired: 'Hết thời gian',
  abandoned: 'Đã bỏ qua',
  in_progress: 'Đang làm bài',
};

const formatBand = (normalizedScore: number | undefined) => {
  if (normalizedScore === undefined) return '--';
  return (Math.round(normalizedScore * 9 * 2) / 2).toFixed(1);
};

const formatDateTime = (value: string | undefined) => {
  if (!value) return 'Chưa có';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatAnswer = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed || 'Chưa trả lời';
};

const buildFallbackDetails = (result: ObjectiveResult | undefined): ObjectiveResultDetail[] => {
  if (!result?.itemResults) return [];

  return result.itemResults.map((item, index) => ({
    itemId: item.itemId,
    order: index + 1,
    prompt: `Câu ${index + 1}`,
    learnerAnswer: '',
    correctAnswers: [],
    correct: item.correct,
  }));
};

const IeltsResultPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data: attempt, isLoading, isError } = useAttempt(attemptId ?? undefined);
  const { data: resultResponse, isLoading: resultLoading } = useAttemptResult(attemptId ?? undefined);

  if (!attemptId) {
    return <Navigate to={PATHS.DASHBOARD.IELTS_PRACTICE} replace />;
  }

  const resultCandidate = resultResponse?.result ?? attempt?.result;
  const objectiveResult = resultCandidate?.gradingType === 'objective'
    ? resultCandidate as ObjectiveResult
    : undefined;
  const aiResult = (resultResponse?.result?.gradingType === 'ai'
    ? resultResponse.result
    : attempt?.result?.gradingType === 'ai'
      ? attempt.result
      : undefined) as AiResult | undefined;
  const details = objectiveResult?.details?.length
    ? objectiveResult.details
    : buildFallbackDetails(objectiveResult);
  const skillInfo = attempt ? IELTS_SKILL_LABELS[attempt.skill] : null;
  const status = resultResponse?.status ?? attempt?.status;
  const statusLabel = status ? STATUS_LABELS[status] ?? status : 'Đang tải';
  const correct = objectiveResult?.correct ?? 0;
  const total = objectiveResult?.total ?? 0;
  const incorrect = Math.max(total - correct, 0);
  const answered = details.filter((item) => item.learnerAnswer.trim().length > 0).length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const band = aiResult ? aiResult.overallBand.toFixed(1) : formatBand(objectiveResult?.normalizedScore);
  const submittedAt = resultResponse?.submittedAt ?? attempt?.submittedAt;
  const isObjective = !!objectiveResult;
  const isAi = !!aiResult;
  const showPendingMessage = !isObjective && !isAi && (status === 'submitted' || resultResponse?.grading === 'not_available');

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Điều hướng">
        <Link to={PATHS.DASHBOARD.IELTS_PRACTICE}>Luyện đề IELTS</Link>
        <span aria-hidden="true">/</span>
        <span>Kết quả bài làm</span>
      </nav>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>IELTS Practice</p>
          <h1 className={styles.title}>Kết quả bài thi</h1>
          <p className={styles.subtitle}>
            Tổng quan điểm số và đối chiếu chi tiết từng câu trong bài làm.
          </p>
        </div>

        {attempt && (
          <div className={styles.headerActions}>
            <Link to={PATHS.DASHBOARD.IELTS_SKILL(attempt.skill)} className={styles.secondaryLink}>
              Luyện tiếp
            </Link>
            <Link to={PATHS.DASHBOARD.IELTS_PRACTICE} className={styles.primaryLink}>
              Về Practice Hub
            </Link>
          </div>
        )}
      </header>

      {(isLoading || resultLoading) && (
        <section className={styles.centerBox}>
          <div className={styles.spinner} aria-label="Đang tải kết quả" />
          <p>Đang tải kết quả bài làm...</p>
        </section>
      )}

      {isError && (
        <section className={styles.centerBox}>
          <h2>Không thể tải kết quả</h2>
          <p>Vui lòng thử lại sau.</p>
          <Link to={PATHS.DASHBOARD.IELTS_PRACTICE} className={styles.primaryLink}>
            Quay lại IELTS Practice
          </Link>
        </section>
      )}

      {!isLoading && !resultLoading && !isError && attempt && (
        <>
          <section className={styles.summaryCard} aria-label="Tổng quan kết quả">
            <div className={styles.scoreBlock}>
              <div className={styles.scoreCircle}>
                <strong>{band}</strong>
                <span>Band</span>
              </div>

              <span className={styles.skillBadge}>
                {skillInfo?.icon} {skillInfo?.name ?? attempt.skill}
              </span>

              <p className={styles.scoreLine}>
                {isObjective ? `${correct} / ${total} · Tỷ lệ đúng: ${percent}%` : statusLabel}
              </p>
            </div>

            <div className={styles.summaryContent}>
              <div className={styles.summaryTopline}>
                <div>
                  <span>Hiệu suất bài làm</span>
                  <strong>{isAi ? band : isObjective ? `${percent}%` : statusLabel}</strong>
                </div>
                <span className={styles.statusPill}>{statusLabel}</span>
              </div>

              <div className={styles.progressTrack} aria-hidden="true">
                <span style={{ width: `${isAi ? (aiResult.overallBand / 9) * 100 : percent}%` }} />
              </div>

              <div className={styles.metricGrid}>
                {isAi ? (
                  <>
                    <div>
                      <span>Task Achievement</span>
                      <strong>{aiResult.criteria.taskAchievement.toFixed(1)}</strong>
                    </div>
                    <div>
                      <span>Coherence & Cohesion</span>
                      <strong>{aiResult.criteria.coherenceCohesion.toFixed(1)}</strong>
                    </div>
                    <div>
                      <span>Lexical Resource</span>
                      <strong>{aiResult.criteria.lexicalResource.toFixed(1)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span>Câu đúng</span>
                      <strong>{correct}</strong>
                    </div>
                    <div>
                      <span>Câu sai</span>
                      <strong>{incorrect}</strong>
                    </div>
                    <div>
                      <span>Đã trả lời</span>
                      <strong>{answered}/{total}</strong>
                    </div>
                  </>
                )}
              </div>
              {isAi && (
                <div className={styles.metricGrid}>
                  <div>
                    <span>Grammar Range & Accuracy</span>
                    <strong>{aiResult.criteria.grammarRangeAccuracy.toFixed(1)}</strong>
                  </div>
                  <div>
                    <span>Phiên bản chấm</span>
                    <strong>{aiResult.gradingVersion.replace('openai:', '')}</strong>
                  </div>
                  <div>
                    <span>Kiểu chấm</span>
                    <strong>AI Teacher</strong>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.metaGrid} aria-label="Thông tin bài làm">
            <div>
              <span>Trạng thái</span>
              <strong>{statusLabel}</strong>
            </div>
            <div>
              <span>Kỹ năng</span>
              <strong>{skillInfo?.label ?? attempt.skill}</strong>
            </div>
            <div>
              <span>Phiên bản đề</span>
              <strong>v{attempt.testVersion}</strong>
            </div>
            <div>
              <span>Nộp lúc</span>
              <strong>{formatDateTime(submittedAt)}</strong>
            </div>
          </section>

          {showPendingMessage && (
            <section className={styles.notice}>
              Bài làm đã được ghi nhận. Chức năng chấm Writing/Speaking sẽ được cập nhật sau.
            </section>
          )}

          {isObjective && (
            <section className={styles.detailSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <span>Chi tiết bài làm</span>
                  <h2>Kết quả từng câu</h2>
                </div>
                <strong>{correct}/{total} câu đúng · {percent}%</strong>
              </div>

              <div className={styles.detailList}>
                {details.map((item) => (
                  <article
                    key={item.itemId}
                    className={`${styles.detailItem} ${item.correct ? styles.correct : styles.wrong}`}
                  >
                    <div className={styles.itemHeader}>
                      <div>
                        <span>Câu {item.order}</span>
                        <small>{item.itemId}</small>
                      </div>
                      <strong>{item.correct ? 'Đúng' : 'Sai'}</strong>
                    </div>
                    <p className={styles.prompt}>{item.prompt}</p>
                    <div className={styles.answerGrid}>
                      <div>
                        <span>Bạn trả lời</span>
                        <strong>{formatAnswer(item.learnerAnswer)}</strong>
                      </div>
                      <div>
                        <span>Đáp án đúng</span>
                        <strong>{item.correctAnswers.length ? item.correctAnswers.join(' / ') : 'Đã chấm tự động'}</strong>
                      </div>
                    </div>
                    {item.explanation && <p className={styles.explanation}>{item.explanation}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {isAi && (
            <section className={styles.detailSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <span>Chữa bài Writing</span>
                  <h2>Nhận xét chi tiết từ giáo viên IELTS</h2>
                </div>
                <strong>Band {aiResult.overallBand.toFixed(1)}</strong>
              </div>

              <div className={styles.feedbackGrid}>
                <article className={styles.feedbackCard}>
                  <h3>Điểm mạnh</h3>
                  <ul>
                    {aiResult.strengths.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
                <article className={styles.feedbackCard}>
                  <h3>Cần cải thiện</h3>
                  <ul>
                    {aiResult.improvements.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              </div>

              <article className={styles.longFeedback}>
                <h3>Nhận xét tổng quan</h3>
                <p>{aiResult.detailedFeedback}</p>
              </article>

              <article className={styles.longFeedback}>
                <h3>Bài sửa gợi ý</h3>
                <p>{aiResult.correctedEssay}</p>
              </article>

              <article className={styles.longFeedback}>
                <h3>Ghi chú giáo viên</h3>
                <ul>
                  {aiResult.teacherNotes.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            </section>
          )}
        </>
      )}
    </main>
  );
};

export default IeltsResultPage;
