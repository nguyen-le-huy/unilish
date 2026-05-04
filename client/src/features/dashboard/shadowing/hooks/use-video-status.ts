import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import type { ApiErrorResponse } from '@/types/common';
import { shadowingService } from '../api/shadowing.service';
import type { VideoStatusResponse } from '../types/shadowing.types';

const buildShadowingPlayerPath = (videoId: string): string => {
    return `/dashboard/shadowing/${encodeURIComponent(videoId)}`;
};

export const useVideoStatus = (videoId: string | null) => {
    const navigate = useNavigate();

    const query = useQuery<VideoStatusResponse, AxiosError<ApiErrorResponse>>({
        queryKey: ['shadowing', 'status', videoId],
        queryFn: () => shadowingService.getVideoStatus(videoId ?? ''),
        enabled: Boolean(videoId),
        refetchInterval: (currentQuery) => (currentQuery.state.data?.status === 'processing' ? 3_000 : false),
    });

    useEffect(() => {
        if (query.data?.status !== 'ready') {
            return;
        }

        const readyVideoId = query.data.video?.videoId ?? videoId;
        if (readyVideoId) {
            navigate(buildShadowingPlayerPath(readyVideoId));
        }
    }, [navigate, query.data?.status, query.data?.video?.videoId, videoId]);

    return query;
};
