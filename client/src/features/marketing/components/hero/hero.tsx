import styles from './hero.module.css';
import heroVideo from '@/assets/videos/pronuciation.mp4';
import arrowRight from '@/assets/icons/arrow-right.svg';
import { Button } from '@/components/core/Button';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';

const Hero = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.hero}>
            <div className={styles.content}>
                <h1>The most effective way to<br />learn a language</h1>
                <p>Talk out loud, get instant feedback, and become fluent<br />with the world’s most advanced AI language tutor.</p>
                <Button
                    type="button"
                    variant="cta"
                    className={styles.ctaButton}
                    rightIcon={arrowRight}
                    onClick={() => navigate(PATHS.DASHBOARD.ROOT)}
                >
                    Start Speaking
                </Button>
            </div>
            <video src={heroVideo} autoPlay loop muted playsInline className={styles.video}/>
        </div>
    );
};

export default Hero;