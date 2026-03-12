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
                <h1>Cách hiệu quả nhất để<br />học một ngôn ngữ</h1>
                <p>Luyện nói thành tiếng, nhận phản hồi tức thì và trở nên tự tin<br />với gia sư ngôn ngữ AI tiên tiến nhất.</p>
                <Button
                    type="button"
                    variant="cta"
                    className={styles.ctaButton}
                    rightIcon={arrowRight}
                    onClick={() => navigate(PATHS.DASHBOARD.ROOT)}
                >
                    Bắt đầu luyện nói
                </Button>
            </div>
            <video src={heroVideo} autoPlay loop muted playsInline className={styles.video}/>
        </div>
    );
};

export default Hero;