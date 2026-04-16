import styles from './home-page.module.css';
import { ActivityCard } from '../components/ActivityCard/ActivityCard';
import { CurrentSeriesCard } from '../components/CurrentSeriesCard/CurrentSeriesCard';
import { LearningProgressCard } from '../components/LearningProgressCard/LearningProgressCard';
import { RankingCard } from '../components/RankingCard/RankingCard';
import { UpgradeCard } from '../components/UpgradeCard/UpgradeCard';

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
