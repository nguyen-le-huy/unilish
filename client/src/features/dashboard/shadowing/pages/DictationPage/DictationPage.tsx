import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Loading } from '@/components/common/Loading/Loading';
import type { ApiErrorResponse } from '@/types/common';
import { shadowingService } from '../../api/shadowing.service';
import type { VideoStatusResponse } from '../../types/shadowing.types';
import DictationPlayer from '../../components/DictationPlayer/DictationPlayer';
import styles from './DictationPage.module.css';

const LIBRARY_PATH = '/dashboard/shadowing';

const DictationPage = () => {
    const navigate = useNavigate();
    const { videoId } = useParams<{ videoId: string }>();
    const { data, isPending, isError, error } = useQuery<VideoStatusResponse, AxiosError<ApiErrorResponse>>({
        queryKey: ['shadowing', 'video', videoId],
        queryFn: () => shadowingService.getVideoStatus(videoId ?? ''),
        enabled: Boolean(videoId),
    });

    const video = data?.status === 'ready' ? data.video : undefined;

    useEffect(() => {
        if (!videoId || (data && data.status !== 'ready')) navigate(LIBRARY_PATH, { replace: true });
    }, [data, navigate, videoId]);

    if (isError) return <div className={styles.statePage}><p>{error.response?.data.message ?? 'Không thể tải bài chép chính tả.'}</p></div>;
    if (isPending || !video) return <div className={styles.statePage}><Loading variant="inline" size="md" /></div>;

    return (
        <div className={styles.page}>
            <header className={styles.pageHeader}>
                <button type="button" onClick={() => navigate(LIBRARY_PATH)} aria-label="Quay lại thư viện">←</button>
                <div>
                    <span>Chép chính tả / Đang luyện tập</span>
                    <h1>{video.title}</h1>
                </div>
                <button className={styles.switchMode} type="button" onClick={() => navigate(`/dashboard/shadowing/${encodeURIComponent(video.videoId)}`)}>Đổi sang nói đuổi</button>
            </header>
            <main className={styles.pageMain}>
                <DictationPlayer key={video.videoId} video={video} />
            </main>
        </div>
    );
};

export default DictationPage;
