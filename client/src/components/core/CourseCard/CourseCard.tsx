import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/core/Button';
import styles from './CourseCard.module.css';

const defaultCourseImage = 'https://www.figma.com/api/mcp/asset/cca5f02b-7e01-427a-977b-821949acec2e';

interface CourseCardProps {
    title?: string;
    description?: string;
    imageUrl?: string;
    badge?: string;
    totalUnits?: number;
    href?: string;
    joinLabel?: string;
    onJoin?: () => void;
}

const CourseCard = ({
    title = 'Khoá Tiếng Pháp',
    description = 'Monitor your shipment status in real-time. Stay informed about your delivery\'s progress every step of the way.',
    imageUrl = defaultCourseImage,
    badge,
    totalUnits,
    href,
    joinLabel = 'Tham Gia',
    onJoin,
}: CourseCardProps) => {
    const navigate = useNavigate();
    const isJoinDisabled = !onJoin && !href;
    const handleJoin = useCallback(() => {
        if (onJoin) {
            onJoin();
            return;
        }

        if (href) {
            navigate(href);
        }
    }, [href, navigate, onJoin]);

    return (
        <article className={styles.courseCard}>
            <div className={styles.innerCard}>
                <div className={styles.imageWrapper}>
                    <img src={imageUrl} alt={title} className={styles.image} loading="lazy" />
                    {badge && <span className={styles.imageBadge}>{badge}</span>}
                </div>

                <div className={styles.content}>
                    <h3 className={styles.title}>{title}</h3>
                    <p className={styles.description}>{description}</p>
                    {typeof totalUnits === 'number' && (
                        <div className={styles.meta}>
                            <span className={styles.lessonIcon} aria-hidden="true">
                                <svg viewBox="0 0 20 20" fill="none">
                                    <path d="M4.25 3.75h8.5a2 2 0 0 1 2 2v10.5h-8.5a2 2 0 0 1-2-2V3.75Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                                    <path d="M6.25 16.25a2 2 0 0 1 2-2h6.5M7.25 7h4.5M7.25 10h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                </svg>
                            </span>
                            <span className={styles.totalCourses}>{totalUnits} bài học</span>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Button
                            type="button"
                            variant="outline"
                            padding="B"
                            borderColor="var(--grey)"
                            textColor="#000"
                            className={styles.joinButton}
                            onClick={handleJoin}
                            disabled={isJoinDisabled}
                            rightIcon={(
                                <svg className={styles.arrowIcon} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M4.5 10h10M10.75 5.75 15 10l-4.25 4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                            iconWidth={18}
                        >
                            {joinLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
};

export default CourseCard;
