import styles from './home-page.module.css';
import { ActivityCard } from '../components/ActivityCard/ActivityCard';
import { CurrentCourseCard } from '../components/CurrentSeriesCard/CurrentCourseCard';
import { LearningProgressCard } from '../components/LearningProgressCard/LearningProgressCard';
import { RankingCard } from '../components/RankingCard/RankingCard';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';

interface DashboardHomePageProps {
  className?: string;
}

const DashboardHomePage = ({ className }: DashboardHomePageProps) => {
  const navigate = useNavigate();
  const fullName = useAuthStore((state) => state.user?.fullName);
  const nameParts = fullName?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[nameParts.length - 1];
  const homeClassName = className ? `${styles.home} ${className}` : styles.home;

  return (
    <div className={homeClassName}>
      <header className={styles.welcome}>
        <div>
          <span className={styles.eyebrow}>Không gian học tập</span>
          <h1>Chào {firstName || 'bạn'}, sẵn sàng học hôm nay?</h1>
          <p>Tiếp tục hành trình của bạn hoặc khám phá một khóa học mới.</p>
        </div>
        <button
          type="button"
          className={styles.exploreButton}
          onClick={() => navigate(PATHS.DASHBOARD.ALL_COURSES)}
        >
          Khám phá khóa học
          <span aria-hidden="true">→</span>
        </button>
      </header>
      <div className={styles.grid}>
        <CurrentCourseCard className={styles.currentSeriesBox} />
        <LearningProgressCard className={styles.progressBox} />
        <ActivityCard className={styles.streakBox} />
        <RankingCard className={styles.rankBox} />
      </div>
    </div>
  );
};

export default DashboardHomePage;
