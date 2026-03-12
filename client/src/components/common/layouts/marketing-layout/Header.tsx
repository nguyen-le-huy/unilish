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
            <img src={unilishLogo} alt="Logo Unilish" width="80"/>
            <div className={styles.buttonList}>
                <div className={styles.buttonExplore}>
                    <p>Khám phá</p>
                    <img src={arrowDown} alt="Mũi tên xuống" width="12"/>
                </div>
                <div className={styles.buttonLanguage}>
                    <p>Tiếng Việt</p>
                    <img src={arrowDown} alt="Mũi tên xuống" width="12"/>
                </div>
                <Button
                    type="button"
                    variant="cta"
                    rightIcon={arrowRight}
                    onClick={() => navigate(PATHS.DASHBOARD.ROOT)}
                >
                    Bắt đầu
                </Button>
            </div>
        </header>
    );
};

export default Header;