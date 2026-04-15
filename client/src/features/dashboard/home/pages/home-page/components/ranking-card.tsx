import avatarImage from '@/assets/images/hi.png';
import top1Image from '@/assets/images/Top1.png';
import top2Image from '@/assets/images/Top2.png';
import top3Image from '@/assets/images/Top3.png';
import styles from './ranking-card.module.css';

interface RankingEntry {
  id: number;
  name: string;
  score: string;
  rank: number;
}

const rankingEntries: RankingEntry[] = [
  { id: 1, name: 'Phương Anh', score: '980/990', rank: 1 },
  { id: 2, name: 'Linh Anh', score: '970/990', rank: 2 },
  { id: 3, name: 'Linh Chi', score: '960/990', rank: 3 },
  { id: 4, name: 'Linh Xinh', score: '950/990', rank: 4 },
  { id: 5, name: 'Ánh Ngọc ', score: '900/990', rank: 5 },
];

interface RankingCardProps {
  className?: string;
}

const topBadgeByRank: Record<number, string> = {
  1: top1Image,
  2: top2Image,
  3: top3Image,
};

export const RankingCard = ({ className }: RankingCardProps) => {
  const cardClassName = className ? `${styles.card} ${className}` : styles.card;

  return (
    <article className={cardClassName}>
      <header className={styles.header}>
        <h2 className={styles.title}>Bảng xếp hạng Toeic Test 01-2026</h2>
        <button type="button" className={styles.viewAllButton}>
          Xem tất cả
        </button>
      </header>

      <ul className={styles.rankList}>
        {rankingEntries.map((entry) => {
          const topBadge = topBadgeByRank[entry.rank];

          return (
            <li className={styles.rankItem} key={entry.id}>
              <div className={styles.userInfo}>
                <img src={avatarImage} alt={entry.name} className={styles.avatar} />
                <span className={styles.name}>{entry.name}</span>
              </div>

              <span className={styles.score}>{entry.score}</span>

              <div className={styles.rankBadge}>
                {topBadge ? (
                  <img
                    src={topBadge}
                    alt={`Top ${entry.rank}`}
                    className={entry.rank === 2 ? `${styles.topBadgeImage} ${styles.topBadgeSecond}` : styles.topBadgeImage}
                  />
                ) : (
                  <span className={styles.rankNumber}>{entry.rank}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
};
