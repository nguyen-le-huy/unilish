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
    totalCourses?: number;
    href?: string;
    joinLabel?: string;
    onJoin?: () => void;
}

const CourseCard = ({
    title = 'Khoá Tiếng Pháp',
    description = 'Monitor your shipment status in real-time. Stay informed about your delivery’s progress every step of the way.',
    imageUrl = defaultCourseImage,
    badge,
    totalCourses,
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
                    <img src={imageUrl} alt={title} className={styles.image} />
                </div>

                <div className={styles.content}>
                    <h3 className={styles.title}>{title}</h3>
                    <p className={styles.description}>{description}</p>
                    {(badge || typeof totalCourses === 'number') && (
                        <div className={styles.meta}>
                            {badge && <span className={styles.badge}>{badge}</span>}
                            {typeof totalCourses === 'number' && (
                                <span className={styles.totalCourses}>{totalCourses} khoá học</span>
                            )}
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
