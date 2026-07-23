import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Loading } from '@/components/common/Loading/Loading';
import type { ApiErrorResponse } from '@/types/common';
import styles from './ShadowingPlayerPage.module.css';
import ShadowingPlayer from '../../components/ShadowingPlayer/ShadowingPlayer';
import { shadowingService } from '../../api/shadowing.service';
import type { VideoStatusResponse } from '../../types/shadowing.types';

const SHADOWING_LIBRARY_PATH = '/dashboard/shadowing';

type ShadowingMode = 'with-transcript' | 'without-transcript';

const ShadowingPlayerPage = () => {
    const navigate = useNavigate();
    const { videoId } = useParams<{ videoId: string }>();
    const [mode, setMode] = useState<ShadowingMode>('with-transcript');

    const { data, isPending, isError, error } = useQuery<VideoStatusResponse, AxiosError<ApiErrorResponse>>({
        queryKey: ['shadowing', 'video', videoId],
        queryFn: () => shadowingService.getVideoStatus(videoId ?? ''),
        enabled: Boolean(videoId),
    });

    const video = data?.status === 'ready' ? data.video : undefined;

    useEffect(() => {
        if (!videoId) {
            navigate(SHADOWING_LIBRARY_PATH, { replace: true });
        }
    }, [navigate, videoId]);

    useEffect(() => {
        if (!data || data.status === 'ready') {
            return;
        }

        navigate(SHADOWING_LIBRARY_PATH, { replace: true });
    }, [data, navigate]);

    if (!videoId) {
        return null;
    }

    if (isError) {
        return (
            <div className={styles.statusWrapper}>
                <p className={styles.errorText} role="alert">
                    {error.response?.data.message ?? 'Không thể tải video luyện nói.'}
                </p>
            </div>
        );
    }

    if (isPending || !video) {
        return (
            <div className={styles.statusWrapper}>
                <Loading variant="inline" size="md" />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button
                    className={styles.backButton}
                    type="button"
                    onClick={() => navigate(SHADOWING_LIBRARY_PATH)}
                    aria-label="Quay lại thư viện luyện nói"
                >
                    ←
                </button>
                <div className={styles.titleBlock}>
                    <p className={styles.breadcrumb}>Luyện nói đuổi / Đang luyện tập</p>
                    <h1>{video.title}</h1>
                </div>
                <div className={styles.videoMeta}>
                    <span>{video.cues.length} câu</span>
                    <i aria-hidden="true" />
                    <span>{Math.max(1, Math.ceil(video.durationSeconds / 60))} phút</span>
                </div>
            </header>

            <main className={styles.mainLayout}>
                <ShadowingPlayer
                    key={video.videoId}
                    video={video}
                    mode={mode}
                    onModeChange={setMode}
                />
            </main>
        </div>
    );
};

export default ShadowingPlayerPage;
