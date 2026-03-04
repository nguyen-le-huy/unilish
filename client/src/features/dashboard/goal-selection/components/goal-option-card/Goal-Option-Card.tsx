import React from 'react';
import styles from './goal-option-card.module.css';

interface Props {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    selected?: boolean;
    onClick?: () => void;
}

const GoalOptionCard = ({
    icon,
    title = 'Du lịch & Sinh tồn',
    description = 'Lộ trình giao tiếp cấp tốc giúp bạn tự tin xử lý mọi tình huống thực tế khi đi du lịch hoặc công tác nước ngoài.',
    selected = false,
    onClick,
}: Props) => {
    return (
        <div
            className={`${styles.card} ${selected ? styles.selected : ''}`}
            onClick={onClick}
        >
            <div className={styles.topRow}>
                <div className={styles.iconBox}>
                    {icon}
                </div>
                <div className={`${styles.radio} ${selected ? styles.radioSelected : ''}`} />
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
        </div>
    );
};

export default GoalOptionCard;