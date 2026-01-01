import styles from './Home.module.css';
import { Link } from 'react-router-dom';

export default function HomePage() {
    return (
        <div className={styles.container}>
            <h1 className={styles.heroTitle}>Master English with Context</h1>
            <p className={styles.text}>
                Unilish combines vocabulary, grammar, listening, and speaking into a unified AI-powered learning experience.
            </p>
            <div className={styles.actions}>
                <Link to="/app" className={styles.buttonPrimary}>
                    Get Started
                </Link>
                <button className={styles.buttonOutline}>
                    View Features
                </button>
            </div>
        </div>
    );
}
