import styles from './NotiIcon.module.css';
import notiIcon from '@/assets/icons/notification.svg';

const NotiIcon = () => {
    return (
        <div className={styles.ctaNoti}>
          <img src={notiIcon} alt="Notification icon" width="28" />
          <span className={styles.ctaNotiBadge}>3</span>
        </div>
    );
}

export default NotiIcon;