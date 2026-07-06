import cardIcon from '@/assets/images/dropdown-user/card.svg';
import logoutIcon from '@/assets/images/dropdown-user/logout.svg';
import settingIcon from '@/assets/images/dropdown-user/setting.svg';
import userIcon from '@/assets/images/dropdown-user/user.svg';
import HeaderAvatar from '@/features/dashboard/user/components/HeaderAvatar/HeaderAvatar';
import { useAuthStore } from '@/stores/auth.store';
import styles from './UserDropdown.module.css';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';

interface UserDropdownProps {
  onClose?: () => void;
  onLogout?: () => void;
}

interface DropdownItem {
  id: 'profile' | 'payment' | 'setting' | 'logout';
  label: string;
  icon: string;
  iconClassName: string;
}

const dropdownItems: DropdownItem[] = [
  { id: 'profile', label: 'Trang cá nhân', icon: userIcon, iconClassName: 'userIcon' },
  { id: 'payment', label: 'Thanh toán', icon: cardIcon, iconClassName: 'cardIcon' },
  { id: 'setting', label: 'Cài đặt', icon: settingIcon, iconClassName: 'settingIcon' },
  { id: 'logout', label: 'Đăng xuất', icon: logoutIcon, iconClassName: 'logoutIcon' },
];

const UserDropdown = ({ onClose, onLogout }: UserDropdownProps) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const handleItemClick = (itemId: DropdownItem['id']) => {
    if (itemId === 'logout') {
      onLogout?.();
      return;
    }

    if (itemId === 'profile') {
      navigate(PATHS.DASHBOARD.PROFILE);
    }

    onClose?.();
  };

  return (
    <div className={styles.dropdown} role="menu" aria-label="Menu tài khoản">
      <div className={styles.accountHeader}>
        <div className={styles.avatarWrap}>
          <HeaderAvatar />
        </div>
        <div className={styles.accountInfo}>
          <strong>{user?.fullName || 'Người dùng Unilish'}</strong>
          <span>{user?.email || 'Tài khoản học viên'}</span>
        </div>
      </div>

      <div className={styles.menuGroup}>
        {dropdownItems.filter((item) => item.id !== 'logout').map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => handleItemClick(item.id)}
          >
            <span className={styles.iconWrap}>
              <img src={item.icon} alt="" className={styles[item.iconClassName]} />
            </span>
            <span className={styles.itemLabel}>{item.label}</span>
            <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ))}
      </div>

      <div className={styles.logoutGroup}>
        <button
          type="button"
          role="menuitem"
          className={`${styles.item} ${styles.logoutItem}`}
          onClick={() => handleItemClick('logout')}
        >
          <span className={styles.iconWrap}>
            <img src={logoutIcon} alt="" className={styles.logoutIcon} />
          </span>
          <span className={styles.itemLabel}>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export default UserDropdown;
