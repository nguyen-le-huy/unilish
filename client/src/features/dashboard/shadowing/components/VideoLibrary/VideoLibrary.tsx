import { useCallback, useEffect, useState } from 'react';
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
    const [selectedVideo, setSelectedVideo] = useState<ShadowingVideoSummary | null>(null);
    const navigate = useNavigate();

    const handlePreview = useCallback((video: ShadowingVideoSummary) => {
        setSelectedVideo(video);
    }, []);

    const handleClosePreview = useCallback(() => {
        setSelectedVideo(null);
    }, []);

    const handleStartShadowing = useCallback(() => {
        if (!selectedVideo) {
            return;
        }

        navigate(`/dashboard/shadowing/${encodeURIComponent(selectedVideo.videoId)}`);
    }, [navigate, selectedVideo]);

    const handleStartDictation = useCallback(() => {
        if (!selectedVideo) return;
        navigate(`/dashboard/dictation/${encodeURIComponent(selectedVideo.videoId)}`);
    }, [navigate, selectedVideo]);

    useEffect(() => {
        if (!selectedVideo) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleClosePreview();
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleEscape);
        };
    }, [handleClosePreview, selectedVideo]);

    if (isPending) {
        return (
            <div className={styles.statusWrapper}>
                <Loading variant="inline" size="md" />
            </div>
        );
    }

    if (isError) {
        return <p className={styles.statusMessage} role="alert">{error.response?.data.message ?? 'Không thể tải thư viện video YouTube.'}</p>;
    }

    if (!data || data.data.length === 0) {
        return <p className={styles.statusMessage}>Chưa có video YouTube sẵn sàng để luyện tập.</p>;
    }

    return (
        <>
            <section className={styles.library}>
                <header className={styles.libraryHeader}>
                    <div>
                        <span className={styles.eyebrow}>Nội dung từ YouTube</span>
                        <h2>Thư viện video YouTube</h2>
                        <p>Chọn một video YouTube để chép chính tả hoặc luyện nói đuổi theo từng câu.</p>
                    </div>
                    <div className={styles.libraryCount}>
                        <strong>{data.pagination.total}</strong>
                        <span>video YouTube</span>
                    </div>
                </header>

                <div className={styles.sectionBar}>
                    <div className={styles.sectionTitle}>
                        <i aria-hidden="true" />
                        <span>Video YouTube mới nhất</span>
                    </div>
                    <span className={styles.sectionMeta}>{data.data.length} bài luyện</span>
                </div>

                <div className={styles.grid}>
                    {data.data.map((video) => (
                        <VideoCard
                            key={video.videoId}
                            video={video}
                            onPreview={handlePreview}
                        />
                    ))}
                </div>
            </section>

            {selectedVideo && (
                <div
                    className={styles.modalOverlay}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="practice-mode-title"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) handleClosePreview();
                    }}
                >
                    <div className={styles.modalContent}>
                        <header className={styles.modalHeader}>
                            <div className={styles.modalHeading}>
                                <span className={styles.modalIcon} aria-hidden="true">✦</span>
                                <div>
                                    <span className={styles.modalEyebrow}>Học với YouTube</span>
                                    <h3 id="practice-mode-title" className={styles.modalTitle}>Chọn chế độ luyện tập</h3>
                                </div>
                            </div>
                            <button
                                className={styles.modalClose}
                                type="button"
                                onClick={handleClosePreview}
                                aria-label="Đóng xem trước"
                            >
                                <span aria-hidden="true">×</span>
                            </button>
                        </header>
                        <div className={styles.selectedVideoInfo}>
                            <img src={selectedVideo.thumbnailUrl} alt="" />
                            <div>
                                <strong>{selectedVideo.title}</strong>
                                <span>{selectedVideo.cueCount} câu luyện · {Math.max(1, Math.ceil(selectedVideo.durationSeconds / 60))} phút</span>
                            </div>
                        </div>
                        <div className={styles.modeGrid}>
                            <button className={styles.modeCard} type="button" onClick={handleStartDictation}>
                                <span className={styles.modeBadge}>Đề xuất bắt đầu</span>
                                <span className={`${styles.modeIllustration} ${styles.dictationIllustration}`} aria-hidden="true">✎</span>
                                <strong>Nghe – viết chính tả</strong>
                                <p>Nghe từng câu và gõ lại chính xác những gì bạn nghe được.</p>
                                <span className={styles.modeAction}>Bắt đầu chép chính tả →</span>
                            </button>
                            <button className={styles.modeCard} type="button" onClick={handleStartShadowing}>
                                <span className={`${styles.modeIllustration} ${styles.shadowingIllustration}`} aria-hidden="true">♬</span>
                                <strong>Luyện nói đuổi</strong>
                                <p>Nghe, bắt chước cách phát âm và nhận điểm ngay sau khi nói.</p>
                                <span className={styles.modeAction}>Bắt đầu nói đuổi →</span>
                            </button>
                        </div>
                        <footer className={styles.modalFooter}>
                            <span className={styles.modalHint}><i aria-hidden="true">●</i> Bạn có thể đổi chế độ bất cứ lúc nào</span>
                            <button className={styles.modalGhostButton} type="button" onClick={handleClosePreview}>Để sau</button>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};

export default VideoLibrary;
