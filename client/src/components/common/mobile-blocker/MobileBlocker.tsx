import styles from './MobileBlocker.module.css';
import Logo from '@/assets/images/Unilish.svg'; // Assuming we have the logo here based on previous files

export const MobileBlocker = () => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <img src={Logo} alt="Unilish" width={120} style={{ marginBottom: '24px' }} />
                <h1 className={styles.title}>Desktop Only Experience</h1>
                <p className={styles.description}>
                    Unilish is designed for a rich desktop experience.
                    Please access the application on a larger screen (Laptop or Desktop) for the best learning experience.
                </p>
                <p className={styles.description} style={{ marginTop: '12px', fontSize: '14px' }}>
                    Mobile version coming soon!
                </p>
            </div>
        </div>
    );
};
