import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useIeltsSummary } from '../hooks/use-ielts-summary';
import { IELTS_SKILL_LABELS, type IeltsSkill } from '../types/ielts-practice.types';
import styles from './IeltsPracticePage.module.css';

const SKILLS: IeltsSkill[] = ['listening', 'reading', 'writing', 'speaking'];

const SKILL_DESCRIPTIONS: Record<IeltsSkill, string> = {
  listening: 'Luyện nghe hội thoại và bài nói học thuật theo cấu trúc IELTS.',
  reading: 'Đọc hiểu, xác định thông tin và làm quen các dạng câu hỏi phổ biến.',
  writing: 'Luyện Task 1 với biểu đồ, bảng số liệu và hướng dẫn triển khai ý rõ ràng.',
  speaking: 'Tăng phản xạ giao tiếp cùng AI Coach theo chủ đề IELTS Speaking.',
};

const SkillIcon = ({ skill }: { skill: IeltsSkill }) => {
  const common = {
    width: 21,
    height: 21,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (skill === 'listening') {
    return (
      <svg {...common}>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M18 13v4a2 2 0 0 1-2 2h-1v-8h1a2 2 0 0 1 2 2Z" />
        <path d="M6 13v4a2 2 0 0 0 2 2h1v-8H8a2 2 0 0 0-2 2Z" />
      </svg>
    );
  }

  if (skill === 'reading') {
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v18H6.5A2.5 2.5 0 0 0 4 23V5.5Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18h4.5A2.5 2.5 0 0 1 20 23V5.5Z" />
        <path d="M7 7h2" />
        <path d="M15 7h2" />
      </svg>
    );
  }

  if (skill === 'writing') {
    return (
      <svg {...common}>
        <path d="M14.5 4.5 19.5 9.5" />
        <path d="M5 19l4.2-.9L19.8 7.5a1.8 1.8 0 0 0 0-2.5L19 4.2a1.8 1.8 0 0 0-2.5 0L5.9 14.8 5 19Z" />
        <path d="M4 21h16" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 14a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v4a4 4 0 0 0 4 4Z" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
};

const IeltsPracticePage = () => {
  const { data, isLoading, isError, error, refetch } = useIeltsSummary();

  const getCount = (skill: IeltsSkill): number | null => {
    if (!data?.skills) return null;
    const found = data.skills.find((s) => s.skill === skill);
    return found?.activeTests ?? 0;
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>IELTS Practice Hub</span>
          <h1>Luyện đề IELTS theo từng kỹ năng</h1>
          <p>Xây dựng chiến lược làm bài, luyện tập có trọng tâm và theo dõi tiến bộ trong một không gian học tập thống nhất.</p>
          <div className={styles.heroMeta}>
            <span><i>4</i> kỹ năng</span>
            <span><i>AI</i> hỗ trợ luyện nói</span>
            <span><i>∞</i> luyện tập theo tốc độ của bạn</span>
          </div>
        </div>
        <div className={styles.bandCard} aria-label="Mục tiêu IELTS">
          <span>Mục tiêu của bạn</span>
          <strong>IELTS</strong>
          <p>Chọn kỹ năng để bắt đầu hành trình luyện thi.</p>
        </div>
      </section>

      <section className={styles.skillsSection}>
        <header className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionKicker}>Chọn nội dung</span>
            <h2>Bốn kỹ năng IELTS</h2>
          </div>
          <p>Chọn kỹ năng bạn muốn cải thiện và bắt đầu với bộ đề phù hợp.</p>
        </header>

        {isLoading && (
          <div className={styles.skillGrid}>
            {SKILLS.map((skill) => {
              const meta = IELTS_SKILL_LABELS[skill];
              return (
                <div key={skill} className={`${styles.skillCard} ${styles.skeletonCard}`} aria-busy="true">
                  <div className={styles.cardTop}>
                    <span className={styles.skillIcon}>
                      <SkillIcon skill={skill} />
                    </span>
                    <span className={styles.skeletonBadge}>&nbsp;</span>
                  </div>
                  <span className={styles.skillNumber}>—</span>
                  <h3>{meta.name} <small>{meta.label}</small></h3>
                  <p>{SKILL_DESCRIPTIONS[skill]}</p>
                  <span className={styles.cardCta}>
                    Xem danh sách đề <span aria-hidden="true">→</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isError && (
          <div className={styles.errorState} role="alert">
            <p>Không thể tải thông tin đề luyện tập.</p>
            <p className={styles.errorDetail}>{(error as Error)?.message ?? 'Vui lòng thử lại sau.'}</p>
            <button type="button" className={styles.retryButton} onClick={() => refetch()}>
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <div className={styles.skillGrid}>
            {SKILLS.map((skill, index) => {
              const meta = IELTS_SKILL_LABELS[skill];
              const count = getCount(skill);
              const isSpeaking = skill === 'speaking';
              const countLabel = count !== null
                ? `${count} đề luyện tập`
                : 'Đang cập nhật…';
              const isEmpty = !isSpeaking && count !== null && count === 0;

              return (
                <Link
                  key={skill}
                  className={`${styles.skillCard} ${isEmpty ? styles.emptyCard : styles.availableCard}`}
                  to={isEmpty ? '#' : isSpeaking ? PATHS.DASHBOARD.AI_VOICE : PATHS.DASHBOARD.IELTS_SKILL(skill)}
                  aria-disabled={isEmpty ? true : undefined}
                  tabIndex={isEmpty ? -1 : undefined}
                  onClick={(e) => {
                    if (isEmpty) e.preventDefault();
                  }}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.skillIcon}>
                      <SkillIcon skill={skill} />
                    </span>
                    <span className={styles.readyBadge}>
                      {isSpeaking ? 'AI luyện nói' : countLabel}
                    </span>
                  </div>
                  <span className={styles.skillNumber}>0{index + 1}</span>
                  <h3>{meta.name} <small>{meta.label}</small></h3>
                  <p>{SKILL_DESCRIPTIONS[skill]}</p>
                  {isEmpty ? (
                    <span className={styles.cardCtaDisabled}>
                      Sẽ sớm ra mắt
                    </span>
                  ) : (
                    <span className={styles.cardCta}>
                      {isSpeaking ? 'Luyện giao tiếp với AI' : 'Xem danh sách đề'} <span aria-hidden="true">→</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default IeltsPracticePage;
