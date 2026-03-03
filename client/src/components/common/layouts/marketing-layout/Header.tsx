import styles from './Marketing-Layout.module.css';
import unilishLogo from '@/assets/images/Unilish.svg';
import arrowDown from '@/assets/icons/arrow-down.svg';
import arrowRight from '@/assets/icons/arrow-right.svg';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { Button } from '@/components/core/Button';

const Header = () => {
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <img src={unilishLogo} alt="Unilish logo" width="80"/>
            <div className={styles.buttonList}>
                <div className={styles.buttonExplore}>
                    <p>Explore</p>
                    <img src={arrowDown} alt="Arrow down" width="12"/>
                </div>
                <div className={styles.buttonLanguage}>
                    <p>English</p>
                    <img src={arrowDown} alt="Arrow down" width="12"/>
                </div>
                <Button
                    type="button"
                    variant="cta"
                    rightIcon={arrowRight}
                    onClick={() => navigate(PATHS.DASHBOARD.ROOT)}
                >
                    Get Started
                </Button>
            </div>
        </header>
    );
};

export default Header;