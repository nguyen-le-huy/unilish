import styles from './VideoLibrary.module.css';
import VideoCard from '../VideoCard/VideoCard';
import { Loading } from '@/components/common/Loading/Loading';
import { useVideoLibrary } from '../../hooks/use-video-library';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;

const VideoLibrary = () => {
    const { data, isPending, isError, error } = useVideoLibrary(DEFAULT_PAGE, DEFAULT_LIMIT);

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
        <div className={styles.grid}>
            {data.data.map((video) => (
                <VideoCard
                    key={video.videoId}
                    video={video}
                />
            ))}
        </div>
    );
};

export default VideoLibrary;
