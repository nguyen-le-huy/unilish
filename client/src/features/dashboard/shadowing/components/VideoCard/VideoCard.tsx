import styles from './VideoCard.module.css';
import type { ShadowingVideoSummary } from '../../types/shadowing.types';

interface VideoCardProps {
    video: ShadowingVideoSummary;
    onPreview: (video: ShadowingVideoSummary) => void;
}

const VideoCard = ({ video, onPreview }: VideoCardProps) => {
    const durationMinutes = Math.floor(video.durationSeconds / 60);
    const durationSeconds = Math.floor(Math.max(0, video.durationSeconds % 60));
    const durationLabel = `${durationMinutes}:${String(durationSeconds).padStart(2, '0')}`;

    return (
        <article className={styles.cardContainer}>
            <button
                className={styles.imageWrapper}
                onClick={() => onPreview(video)}
                aria-label={`Chọn chế độ luyện với video: ${video.title}`}
                type="button"
            >
                    <img src={video.thumbnailUrl} alt={video.title} className={styles.image} />
                    <span className={styles.sourceBadge}>
                        <i aria-hidden="true">▶</i> YouTube
                    </span>
                    <span className={styles.durationBadge}>{durationLabel}</span>
                    <span className={styles.playButton} aria-hidden="true">▶</span>
            </button>
            <div className={styles.content}>
                <div className={styles.metaRow}>
                    <span className={styles.readyBadge}>Sẵn sàng</span>
                    <span>{video.cueCount} câu luyện</span>
                </div>
                <h3 className={styles.title}>{video.title}</h3>
                <div className={styles.actionWrapper}>
                    <button
                        className={styles.previewBtn}
                        onClick={() => onPreview(video)}
                        aria-label={`Chọn chế độ chép chính tả với video: ${video.title}`}
                        type="button"
                    >
                        Chép chính tả
                    </button>
                    <button
                        className={styles.shadowingBtn}
                        onClick={() => onPreview(video)}
                        aria-label={`Chọn chế độ luyện với video: ${video.title}`}
                        type="button"
                    >
                        Nói đuổi <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        </article>
    );
};

export default VideoCard;
