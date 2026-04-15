import cardIcon from '@/assets/images/dropdown-user/card.svg';
import logoutIcon from '@/assets/images/dropdown-user/logout.svg';
import settingIcon from '@/assets/images/dropdown-user/setting.svg';
import userIcon from '@/assets/images/dropdown-user/user.svg';
import styles from './UserDropdown.module.css';

interface UserDropdownProps {
  onClose?: () => void;
  onLogout?: () => void;
}

interface DropdownItem {
  id: 'profile' | 'payment' | 'setting' | 'logout';
  label: string;
  icon: string;
  iconClassName: string;
  isActive?: boolean;
}

const dropdownItems: DropdownItem[] = [
  { id: 'profile', label: 'Trang cá nhân', icon: userIcon, iconClassName: 'userIcon', isActive: true },
  { id: 'payment', label: 'Thanh toán', icon: cardIcon, iconClassName: 'cardIcon' },
  { id: 'setting', label: 'Cài đặt', icon: settingIcon, iconClassName: 'settingIcon' },
  { id: 'logout', label: 'Đăng xuất', icon: logoutIcon, iconClassName: 'logoutIcon' },
];

const UserDropdown = ({ onClose, onLogout }: UserDropdownProps) => {
  const handleItemClick = (itemId: DropdownItem['id']) => {
    if (itemId === 'logout') {
      onLogout?.();
      return;
    }

    onClose?.();
  };

  return (
    <div className={styles.dropdown} role="menu" aria-label="User menu">
      {dropdownItems.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={item.isActive ? `${styles.item} ${styles.itemActive}` : styles.item}
          onClick={() => handleItemClick(item.id)}
        >
          <img src={item.icon} alt="" className={styles[item.iconClassName]} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default UserDropdown;
