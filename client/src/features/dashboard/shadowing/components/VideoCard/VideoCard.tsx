import { useNavigate } from 'react-router-dom';
import styles from './VideoCard.module.css';
import type { ShadowingVideoSummary } from '../../types/shadowing.types';

interface VideoCardProps {
    video: ShadowingVideoSummary;
}

const VideoCard = ({ video }: VideoCardProps) => {
    const navigate = useNavigate();

    return (
        <article className={styles.cardContainer}>
            <div className={styles.cardInner}>
                <div className={styles.imageWrapper}>
                    <img src={video.thumbnailUrl} alt={video.title} className={styles.image} />
                </div>
                <div className={styles.content}>
                    <h3 className={styles.title}>{video.title}</h3>
                    <div className={styles.actionWrapper}>
                        <button
                            className={styles.shadowingBtn}
                            onClick={() => navigate(`/dashboard/shadowing/${encodeURIComponent(video.videoId)}`)}
                            aria-label={`Mở video shadowing: ${video.title}`}
                        >
                            Shadowing
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default VideoCard;
