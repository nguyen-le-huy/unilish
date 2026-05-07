import { useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/core/Button/Button';
import { Loading } from '@/components/common/Loading/Loading';
import styles from './VideoInput.module.css';
import { useSubmitVideo } from '../../hooks/use-submit-video';
import { useVideoStatus } from '../../hooks/use-video-status';

const isYouTubeUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        return host.includes('youtube.com') || host.includes('youtu.be');
    } catch {
        return false;
    }
};

const submitVideoSchema = z.object({
    url: z
        .string()
        .trim()
        .url('Vui lòng nhập URL hợp lệ.')
        .refine(isYouTubeUrl, 'URL phải là video YouTube.'),
});

type SubmitVideoFormValues = z.infer<typeof submitVideoSchema>;

const VideoInput = () => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<SubmitVideoFormValues>({
        resolver: zodResolver(submitVideoSchema),
        defaultValues: {
            url: '',
        },
    });
    const {
        submitVideo,
        error: submitError,
        isPending,
        processingVideoId,
        clearProcessingVideoId,
    } = useSubmitVideo();
    const {
        data: videoStatus,
        error: videoStatusError,
        isPending: isVideoStatusPending,
        isFetching: isVideoStatusFetching,
    } = useVideoStatus(processingVideoId);

    const onSubmit = useCallback((values: SubmitVideoFormValues) => {
        submitVideo(values.url);
        reset();
    }, [reset, submitVideo]);

    const hasProcessingError = Boolean(processingVideoId)
        && (videoStatus?.status === 'failed' || videoStatusError);

    if (hasProcessingError) {
        const errorMessage = videoStatusError?.response?.data?.message
            ?? videoStatusError?.message
            ?? 'Video xử lý thất bại. Vui lòng thử URL khác.';

        return (
            <div className={styles.processingScreen}>
                <p className={styles.processingTitle} role="alert">
                    {errorMessage}
                </p>
                <Button type="button" onClick={clearProcessingVideoId}>Thử lại</Button>
            </div>
        );
    }

    const isProcessing = Boolean(processingVideoId)
        && (videoStatus?.status === 'processing' || isVideoStatusPending || isVideoStatusFetching);

    if (isProcessing) {
        return (
            <div className={styles.processingScreen} role="status" aria-live="polite">
                <Loading variant="inline" size="md" />
                <p className={styles.processingTitle}>Processing video...</p>
                <p className={styles.processingHint}>Hệ thống đang tách audio và tạo transcript.</p>
            </div>
        );
    }

    return (
        <form className={styles.container} onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.inputWrapper}>
                <input
                    type="text"
                    className={styles.input}
                    aria-label="YouTube video URL"
                    placeholder="Nhập URL video Youtube mà bạn muốn shadowing"
                    disabled={isPending}
                    {...register('url')}
                />
                {errors.url && <p className={styles.errorText} role="alert">{errors.url.message}</p>}
                {submitError && (
                    <p className={styles.errorText} role="alert">
                        {submitError.response?.data.message ?? 'Không thể gửi video. Vui lòng thử lại.'}
                    </p>
                )}
            </div>
            <Button type="submit" disabled={isPending}>
                {isPending ? <Loading variant="inline" size="sm" /> : 'Thêm Video'}
            </Button>
        </form>
    );
};

export default VideoInput;
