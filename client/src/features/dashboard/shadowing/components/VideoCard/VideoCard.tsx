import { useNavigate } from 'react-router-dom';
import styles from './VideoCard.module.css';
import type { ShadowingVideoSummary } from '../../types/shadowing.types';

interface VideoCardProps {
    video: ShadowingVideoSummary;
    onPreview: (video: ShadowingVideoSummary) => void;
}

const VideoCard = ({ video, onPreview }: VideoCardProps) => {
    const navigate = useNavigate();
    const durationMinutes = Math.floor(video.durationSeconds / 60);
    const durationSeconds = Math.max(0, video.durationSeconds % 60);
    const durationLabel = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`;

    return (
        <article className={styles.cardContainer}>
            <div className={styles.cardInner}>
                <div className={styles.imageWrapper}>
                    <img src={video.thumbnailUrl} alt={video.title} className={styles.image} />
                </div>
                <div className={styles.content}>
                    <h3 className={styles.title}>{video.title
                        }</h3>
                    <p className={styles.duration}>Thời lượng: {durationLabel}</p>
                    <div className={styles.actionWrapper}>
                        <button
                            className={styles.previewBtn}
                            onClick={() => onPreview(video)}
                            aria-label={`Xem trước video: ${video.title}`}
                            type="button"
                        >
                            Xem trước
                        </button>
                        <button
                            className={styles.shadowingBtn}
                            onClick={() => navigate(`/dashboard/shadowing/${encodeURIComponent(video.videoId)}`)}
                            aria-label={`Mở video shadowing: ${video.title}`}
                            type="button"
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
