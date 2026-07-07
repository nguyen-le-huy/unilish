import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useIeltsTests } from '../hooks/use-ielts-tests';
import {
  type IeltsSkill,
  type LearnerAttemptScore,
  type TestSummaryDto,
  IELTS_SKILL_LABELS,
} from '../types/ielts-practice.types';
import styles from './IeltsSkillPage.module.css';

const SKILLS: IeltsSkill[] = ['listening', 'reading', 'writing', 'speaking'];
const isSkillSlug = (value: string | undefined): value is IeltsSkill =>
  Boolean(value && SKILLS.includes(value as IeltsSkill));

const SKILL_DESCRIPTIONS: Record<IeltsSkill, string> = {
  listening: 'Luyện nghe theo cấu trúc đề thi thật với bốn phần và nhiều ngữ cảnh giao tiếp khác nhau.',
  reading: 'Thực hành đọc hiểu học thuật, quản lý thời gian và làm quen đầy đủ các dạng câu hỏi IELTS.',
  writing: 'Luyện Task 1 với biểu đồ, bảng số liệu và hướng dẫn triển khai ý rõ ràng.',
  speaking: 'Tăng phản xạ giao tiếp cùng AI Coach theo chủ đề IELTS Speaking.',
};

const MetaIcon = ({ type }: { type: 'document' | 'users' | 'clock' }) => {
  if (type === 'users') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-1.8a3.2 3.2 0 00-3.2-3.2H6.2A3.2 3.2 0 003 18.2V20M9.5 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM17 11a3 3 0 000-5.8M18 15.2a3.2 3.2 0 013 3V20" /></svg>;
  }
  if (type === 'clock') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></svg>;
};

const formatAttemptDate = (attempt: LearnerAttemptScore): string => {
  const value = attempt.submittedAt ?? attempt.startedAt;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
};

const getPrimaryActionLabel = (test: TestSummaryDto): string => {
  if (test.activeAttemptId) return 'Tiếp tục';
  if ((test.learnerStats?.completedCount ?? 0) > 0) return 'Làm lại';
  return 'Xem chi tiết';
};

const IeltsSkillPage = () => {
  const { skill } = useParams();
  const navigate = useNavigate();

  const validatedSkill = isSkillSlug(skill) ? skill : undefined;
  const skillMeta = validatedSkill ? IELTS_SKILL_LABELS[validatedSkill] : undefined;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useIeltsTests({ skill: validatedSkill ?? 'listening', page: 1, limit: 100 });

  const tests = data?.data ?? [];

  if (!validatedSkill || !skillMeta) {
    return <Navigate to={PATHS.DASHBOARD.IELTS_PRACTICE} replace />;
  }

  if (validatedSkill === 'speaking') {
    return <Navigate to={PATHS.DASHBOARD.AI_VOICE} replace />;
  }

  const handleOpenTest = (test: TestSummaryDto) => {
    if (validatedSkill === 'listening') {
      navigate(PATHS.DASHBOARD.IELTS_LISTENING_TEST(test.slug));
      return;
    }
    if (validatedSkill === 'reading') {
      navigate(PATHS.DASHBOARD.IELTS_READING_TEST(test.slug));
      return;
    }
    if (validatedSkill === 'writing') {
      navigate(PATHS.DASHBOARD.IELTS_WRITING_TEST(test.slug));
      return;
    }
  };

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Điều hướng IELTS">
        <Link to={PATHS.DASHBOARD.IELTS_PRACTICE}>Luyện đề IELTS</Link>
        <span aria-hidden="true">/</span>
        <span>{skillMeta.name}</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>IELTS {skillMeta.name}</span>
          <h1>Luyện kỹ năng {skillMeta.name} <small>{skillMeta.label}</small></h1>
          <p>{SKILL_DESCRIPTIONS[validatedSkill]}</p>
        </div>
        <div className={styles.summary}>
          <strong>{data?.meta?.total ?? '—'}</strong>
          <span>đề luyện tập</span>
        </div>
      </header>

      <section className={styles.testSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Thư viện luyện tập</span>
            <h2>Danh sách đề</h2>
          </div>
          <p>Chọn một đề để xem nội dung và bắt đầu luyện tập.</p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className={styles.testGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className={`${styles.testCard} ${styles.skeletonTest}`} aria-busy="true">
                <div className={styles.testInfo}>
                  <div className={styles.titleRow}>
                    <span className={styles.testNumber}>—</span>
                    <h3 className={styles.skeletonTitle}>&nbsp;</h3>
                    <span className={styles.skeletonBadge}>&nbsp;</span>
                  </div>
                  <div className={styles.testMeta}>
                    <span className={styles.skeletonMeta}>&nbsp;</span>
                  </div>
                </div>
                <span className={styles.skeletonAction}>&nbsp;</span>
              </article>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className={styles.errorState} role="alert">
            <p>Không thể tải danh sách đề.</p>
            <p className={styles.errorDetail}>{(error as Error)?.message ?? 'Vui lòng thử lại sau.'}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && tests.length === 0 && (
          <div className={styles.emptyState}>
            <p>Chưa có đề luyện tập cho kỹ năng này.</p>
            <p className={styles.emptyHint}>Vui lòng quay lại sau hoặc chọn kỹ năng khác.</p>
            <Link to={PATHS.DASHBOARD.IELTS_PRACTICE} className={styles.backLink}>
              Quay lại IELTS Practice Hub
            </Link>
          </div>
        )}

        {/* Success state */}
        {!isLoading && !isError && tests.length > 0 && (
          <div className={styles.testGrid}>
            {tests.map((test, index) => (
              <article className={styles.testCard} key={test.id}>
                <div className={styles.testInfo}>
                  <div className={styles.titleRow}>
                    <span className={styles.testNumber}>{String(index + 1).padStart(2, '0')}</span>
                    <h3>{test.title}</h3>
                    <span className={styles.freeBadge}>Miễn phí</span>
                  </div>
                  <div className={styles.testMeta}>
                    <span>
                      <MetaIcon type="document" />
                      {test.questionType === 'academic_task_1_chart'
                        ? '1 bài viết'
                        : test.questionType === 'ai_conversation'
                          ? '1 bài nói'
                          : `${test.itemCount} câu hỏi`}
                    </span>
                    <span>
                      <MetaIcon type="users" />
                      {test.attemptCount.toLocaleString('vi-VN')}
                    </span>
                    <span>
                      <MetaIcon type="clock" />
                      {test.durationMinutes} phút
                    </span>
                  </div>
                  {test.learnerStats && test.learnerStats.completedCount > 0 && (
                    <div className={styles.historyPanel}>
                      <div className={styles.historySummary}>
                        <strong>Đã làm {test.learnerStats.completedCount} lần</strong>
                        {test.learnerStats.latestAttempt?.scoreLabel && (
                          <span>Gần nhất: {test.learnerStats.latestAttempt.scoreLabel}</span>
                        )}
                      </div>
                      <div className={styles.scoreList} aria-label={`Điểm các lần làm ${test.title}`}>
                        {test.learnerStats.scores.slice(0, 3).map((attempt, attemptIndex) => (
                          <Link
                            key={attempt.attemptId}
                            className={styles.scorePill}
                            to={PATHS.DASHBOARD.IELTS_RESULT(attempt.attemptId)}
                          >
                            <span>Lần {test.learnerStats!.completedCount - attemptIndex}</span>
                            <strong>{attempt.scoreLabel ?? 'Đã nộp'}</strong>
                            <small>{formatAttemptDate(attempt)}</small>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => handleOpenTest(test)}>
                  {getPrimaryActionLabel(test)} <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Phân trang">
            <span>
              Trang {data.meta.page}/{data.meta.totalPages}
            </span>
          </nav>
        )}
      </section>
    </main>
  );
};

export default IeltsSkillPage;
