import { useEffect, useRef, useState } from 'react';
import styles from './Dashboard-Layout.module.css';
import unilishLogo from '@/assets/images/Unilish.svg';
import thunderIcon from '@/assets/icons/thunder.svg';
import { Button } from '@/components/core/Button';
import NotiIcon from '@/features/dashboard/notification/components/Icon/NotiIcon';
import HeaderAvatar from '@/features/dashboard/user/components/HeaderAvatar/HeaderAvatar';
import { useAuthStore } from '@/stores/auth.store';
import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import UserDropdown from './UserDropdown';

const DROPDOWN_ANIMATION_MS = 220;

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownMounted, setIsDropdownMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (isDropdownOpen) {
      setIsDropdownMounted(true);
      return;
    }

    if (!isDropdownMounted) {
      return;
    }

    closeTimeoutRef.current = setTimeout(() => {
      setIsDropdownMounted(false);
      closeTimeoutRef.current = null;
    }, DROPDOWN_ANIMATION_MS);

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isDropdownMounted, isDropdownOpen]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  const handleAvatarClick = () => {
    if (isDropdownOpen) {
      closeDropdown();
      return;
    }

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsDropdownMounted(true);
    setIsDropdownOpen(true);
  };

  const handleCloseDropdown = () => {
    closeDropdown();
  };

  const handleLogout = () => {
    logout();
    closeDropdown();
  };

  return (
    <header className={styles.header}>
      <Link to={PATHS.DASHBOARD.HOME} className={styles.logoLink} aria-label="Go to dashboard home">
        <img src={unilishLogo} alt="Unilish logo" className={styles.logo} />
      </Link>
      <div className={styles.cta}>
        <Button variant="outline" leftIcon={thunderIcon} padding="B" iconWidth={20}>Upgrade to Pro</Button>
        <NotiIcon />
        <div className={styles.userMenu} ref={userMenuRef}>
          <button
            type="button"
            className={styles.avatarButton}
            onClick={handleAvatarClick}
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            aria-label="Open user menu"
          >
            <HeaderAvatar />
          </button>

          {isDropdownMounted && (
            <div className={isDropdownOpen ? `${styles.userDropdown} ${styles.userDropdownOpen}` : styles.userDropdown}>
              <UserDropdown onClose={handleCloseDropdown} onLogout={handleLogout} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
