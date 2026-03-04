import styles from './Dashboard-Layout.module.css';
import unilishLogo from '@/assets/images/Unilish.svg';
import thunderIcon from '@/assets/icons/thunder.svg';
import { Button } from '@/components/core/Button';
import NotiIcon from '@/features/dashboard/notification/components/Icon/NotiIcon';
import HeaderAvatar from '@/features/dashboard/user/components/HeaderAvatar/HeaderAvatar';
import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';


const Header = () => {
  return (
    <header className={styles.header}>
      <Link to={PATHS.DASHBOARD.HOME} className={styles.logoLink} aria-label="Go to dashboard home">
        <img src={unilishLogo} alt="Unilish logo" className={styles.logo} />
      </Link>
      <div className={styles.cta}>
        <Button variant="outline" leftIcon={thunderIcon} padding="B" iconWidth={20}>Upgrade to Pro</Button>
        <NotiIcon />
        <HeaderAvatar />
      </div>
    </header>
  );
}

export default Header;