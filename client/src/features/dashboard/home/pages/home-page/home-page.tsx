import styles from './home-page.module.css';
import { ActivityCard } from './components/activity-card';
import { CurrentSeriesCard } from './components/current-series-card';
import { LearningProgressCard } from './components/learning-progress-card';
import { RankingCard } from './components/ranking-card';
import { UpgradeCard } from './components/upgrade-card';

interface DashboardHomePageProps {
  className?: string;
}

const DashboardHomePage = ({ className }: DashboardHomePageProps) => {
  const homeClassName = className ? `${styles.home} ${className}` : styles.home;

  return (
    <div className={homeClassName}>
      <div className={styles.grid}>
        <CurrentSeriesCard className={styles.currentSeriesBox} />
        <LearningProgressCard className={styles.progressBox} />
        <ActivityCard className={styles.streakBox} />
        <UpgradeCard className={styles.upgradeBox} />
        <RankingCard className={styles.rankBox} />
      </div>
    </div>
  );
};

export default DashboardHomePage;
