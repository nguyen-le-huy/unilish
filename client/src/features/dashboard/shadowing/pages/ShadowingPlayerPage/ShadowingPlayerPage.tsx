import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Loading } from '@/components/common/Loading/Loading';
import type { ApiErrorResponse } from '@/types/common';
import styles from './ShadowingPlayerPage.module.css';
import ShadowingPlayer from '../../components/ShadowingPlayer/ShadowingPlayer';
import { shadowingService } from '../../api/shadowing.service';
import type { Cue, UpdateCuesResponse, VideoStatusResponse } from '../../types/shadowing.types';

const SHADOWING_LIBRARY_PATH = '/dashboard/shadowing';

type ShadowingMode = 'with-transcript' | 'without-transcript';

const ShadowingPlayerPage = () => {
    const navigate = useNavigate();
    const { videoId } = useParams<{ videoId: string }>();
    const [mode, setMode] = useState<ShadowingMode>('with-transcript');
    const queryClient = useQueryClient();

    const { data, isPending, isError, error } = useQuery<VideoStatusResponse, AxiosError<ApiErrorResponse>>({
        queryKey: ['shadowing', 'video', videoId],
        queryFn: () => shadowingService.getVideoStatus(videoId ?? ''),
        enabled: Boolean(videoId),
    });

    const updateCuesMutation = useMutation<UpdateCuesResponse, AxiosError<ApiErrorResponse>, Cue[]>({
        mutationFn: async (cues) => {
            return shadowingService.updateVideoCues(videoId ?? '', { cues });
        },
        onSuccess: (payload) => {
            if (!videoId) {
                return;
            }

            queryClient.setQueryData(['shadowing', 'video', videoId], payload);
        },
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
                    {error.response?.data.message ?? 'Unable to load shadowing video.'}
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
                <p className={styles.breadcrumb}>Shadowing &gt; {video.title}</p>
            </header>

            <main className={styles.mainLayout}>
                <ShadowingPlayer
                    video={video}
                    mode={mode}
                    onModeChange={setMode}
                    onSaveCues={async (cues) => {
                        const payload = await updateCuesMutation.mutateAsync(cues);
                        return payload.video.cues;
                    }}
                    isSavingCues={updateCuesMutation.isPending}
                    saveError={updateCuesMutation.error?.response?.data.message ?? null}
                />
            </main>
        </div>
    );
};

export default ShadowingPlayerPage;
