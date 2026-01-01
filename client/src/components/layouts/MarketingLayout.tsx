import { Outlet, Link } from 'react-router-dom';
import styles from './MarketingLayout.module.css';

export default function MarketingLayout() {
    return (
        <div className={styles.wrapper}>
            <header className={styles.header}>
                <div className={styles.headerContainer}>
                    <Link to="/" className={styles.logo}>Unilish</Link>
                    <div className={styles.nav}>
                        {/* Simplified nav - removed complex toggles for now as requested */}
                    </div>
                </div>
            </header>
            <main className={styles.main}>
                <Outlet />
            </main>
            <footer className={styles.footer}>
                <div className={styles.footerContainer}>
                    <p>© 2025 Unilish. Built with Antigravity.</p>
                </div>
            </footer>
        </div>
    );
}
