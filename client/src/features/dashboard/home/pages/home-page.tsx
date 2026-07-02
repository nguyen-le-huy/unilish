import styles from './home-page.module.css';
import { ActivityCard } from '../components/ActivityCard/ActivityCard';
import { CurrentCourseCard } from '../components/CurrentSeriesCard/CurrentCourseCard';
import { LearningProgressCard } from '../components/LearningProgressCard/LearningProgressCard';
import { RankingCard } from '../components/RankingCard/RankingCard';

interface DashboardHomePageProps {
  className?: string;
}

const DashboardHomePage = ({ className }: DashboardHomePageProps) => {
  const homeClassName = className ? `${styles.home} ${className}` : styles.home;

  return (
    <div className={homeClassName}>
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
