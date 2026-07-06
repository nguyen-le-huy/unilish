import { useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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
                <button className={styles.retryButton} type="button" onClick={clearProcessingVideoId}>Thử lại</button>
            </div>
        );
    }

    const isProcessing = Boolean(processingVideoId)
        && (videoStatus?.status === 'processing' || isVideoStatusPending || isVideoStatusFetching);

    if (isProcessing) {
        return (
            <div className={styles.processingScreen} role="status" aria-live="polite">
                <Loading variant="inline" size="md" />
                <p className={styles.processingTitle}>Đang chuẩn bị bài luyện...</p>
                <p className={styles.processingHint}>Hệ thống đang tách audio và tạo transcript.</p>
            </div>
        );
    }

    return (
        <form className={styles.container} onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.intro}>
                <span className={styles.icon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M8 5.5v13l11-6.5L8 5.5Z" fill="currentColor" />
                    </svg>
                </span>
                <div>
                    <span className={styles.kicker}>Tạo bài luyện riêng</span>
                    <h2>Luyện với video bạn yêu thích</h2>
                    <p>Dán liên kết YouTube, hệ thống sẽ tự tạo transcript theo từng câu.</p>
                </div>
            </div>

            <div className={styles.formArea}>
                <div className={styles.inputWrapper}>
                    <div className={styles.inputShell}>
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M10.5 13.5 13.5 10.5M8 16l-1.5 1.5a3.54 3.54 0 0 1-5-5L5 9a3.54 3.54 0 0 1 5 0M16 8l1.5-1.5a3.54 3.54 0 0 1 5 5L19 15a3.54 3.54 0 0 1-5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                        <input
                            type="text"
                            className={styles.input}
                            aria-label="Đường dẫn video YouTube"
                            placeholder="Dán đường dẫn YouTube tại đây..."
                            disabled={isPending}
                            {...register('url')}
                        />
                    </div>
                    {errors.url && <p className={styles.errorText} role="alert">{errors.url.message}</p>}
                    {submitError && (
                        <p className={styles.errorText} role="alert">
                            {submitError.response?.data.message ?? 'Không thể gửi video. Vui lòng thử lại.'}
                        </p>
                    )}
                </div>
                <button className={styles.submitButton} type="submit" disabled={isPending}>
                    {isPending ? <Loading variant="inline" size="sm" /> : (
                        <>
                            Tạo bài luyện
                            <span aria-hidden="true">→</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default VideoInput;
