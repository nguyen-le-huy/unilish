import { useCallback, useState } from 'react';
import styles from './VideoLibrary.module.css';
import VideoCard from '../VideoCard/VideoCard';
import { Loading } from '@/components/common/Loading/Loading';
import { useVideoLibrary } from '../../hooks/use-video-library';
import type { ShadowingVideoSummary } from '../../types/shadowing.types';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

const VideoLibrary = () => {
    const { data, isPending, isError, error } = useVideoLibrary(DEFAULT_PAGE, DEFAULT_LIMIT);
    const [previewVideo, setPreviewVideo] = useState<ShadowingVideoSummary | null>(null);
    const navigate = useNavigate();

    const handlePreview = useCallback((video: ShadowingVideoSummary) => {
        setPreviewVideo(video);
    }, []);

    const handleClosePreview = useCallback(() => {
        setPreviewVideo(null);
    }, []);

    const handleStartShadowing = useCallback(() => {
        if (!previewVideo) {
            return;
        }

        navigate(`/dashboard/shadowing/${encodeURIComponent(previewVideo.videoId)}`);
    }, [navigate, previewVideo]);

    if (isPending) {
        return (
            <div className={styles.statusWrapper}>
                <Loading variant="inline" size="md" />
            </div>
        );
    }

    if (isError) {
        return <p className={styles.statusMessage} role="alert">{error.response?.data.message ?? 'Không thể tải thư viện video.'}</p>;
    }

    if (!data || data.data.length === 0) {
        return <p className={styles.statusMessage}>Chưa có video sẵn sàng để luyện shadowing.</p>;
    }

    return (
        <>
            <div className={styles.grid}>
                {data.data.map((video) => (
                    <VideoCard
                        key={video.videoId}
                        video={video}
                        onPreview={handlePreview}
                    />
                ))}
            </div>

            {previewVideo && (
                <div className={styles.modalOverlay} role="dialog" aria-modal="true">
                    <div className={styles.modalContent}>
                        <header className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{previewVideo.title}</h3>
                            <button
                                className={styles.modalClose}
                                type="button"
                                onClick={handleClosePreview}
                                aria-label="Đóng xem trước"
                            >
                                ✕
                            </button>
                        </header>
                        <div className={styles.modalPlayer}>
                            <iframe
                                src={`https://www.youtube.com/embed/${encodeURIComponent(previewVideo.videoId)}?autoplay=1`}
                                title={previewVideo.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                className={styles.modalGhostButton}
                                type="button"
                                onClick={handleClosePreview}
                            >
                                Đóng
                            </button>
                            <button
                                className={styles.modalPrimaryButton}
                                type="button"
                                onClick={handleStartShadowing}
                            >
                                Bắt đầu shadowing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default VideoLibrary;
