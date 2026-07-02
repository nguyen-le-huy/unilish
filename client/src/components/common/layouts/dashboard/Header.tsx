import { useEffect, useRef, useState } from 'react';
import styles from './Dashboard-Layout.module.css';
import unilishLogo from '@/assets/images/Unilish.svg';
import businessIcon from '@/assets/icons/business.svg';
import micIcon from '@/assets/icons/mic.svg';
import penIcon from '@/assets/icons/pen.svg';
import starIcon from '@/assets/icons/star.svg';
import waveIcon from '@/assets/icons/wave.svg';
import NotiIcon from '@/features/dashboard/notification/components/Icon/NotiIcon';
import HeaderAvatar from '@/features/dashboard/user/components/HeaderAvatar/HeaderAvatar';
import { useAuthStore } from '@/stores/auth.store';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import UserDropdown from './UserDropdown';

interface SidebarItem {
  label: string;
  path: string;
  icon: string;
  badge?: string;
  match?: (pathname: string) => boolean;
}

const primaryItems: SidebarItem[] = [
  { label: 'Home', path: PATHS.DASHBOARD.HOME, icon: businessIcon, match: (pathname) => pathname === PATHS.DASHBOARD.HOME },
  { label: 'AI Voice', path: '/dashboard/ai-voice', icon: micIcon },
  { label: 'Shadowing', path: '/dashboard/shadowing', icon: waveIcon, badge: 'New' },
  { label: 'Recommend Course', path: PATHS.DASHBOARD.RECOMMEND_COURSE, icon: starIcon },
  {
    label: 'Placement Test',
    path: PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING,
    icon: penIcon,
    match: (pathname) => pathname.startsWith(PATHS.DASHBOARD.PLACEMENT_TEST.ROOT),
  },
];

const pageTitles: Array<{ match: (pathname: string) => boolean; label: string }> = [
  { match: (pathname) => pathname === PATHS.DASHBOARD.HOME, label: 'Home' },
  { match: (pathname) => pathname.startsWith('/dashboard/ai-voice'), label: 'AI Voice' },
  { match: (pathname) => pathname.startsWith('/dashboard/shadowing'), label: 'Shadowing' },
  { match: (pathname) => pathname.startsWith(PATHS.DASHBOARD.PLACEMENT_TEST.ROOT), label: 'Placement Test' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.RECOMMEND_COURSE, label: 'Recommend Course' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.GOAL_SELECTION, label: 'Learning Goal' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.LANGUAGE_SELECTION, label: 'Language' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.LEVEL_SELECTION, label: 'Level' },
];

const getPageTitle = (pathname: string) => pageTitles.find((item) => item.match(pathname))?.label ?? 'Dashboard';

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const logout = useAuthStore((state) => state.logout);
  const { pathname } = useLocation();

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
    <>
      <aside className={styles.sidebar}>
        <Link to={PATHS.DASHBOARD.HOME} className={styles.logoLink} aria-label="Go to dashboard home">
          <img src={unilishLogo} alt="Unilish logo" className={styles.logo} />
        </Link>

        <div className={styles.workspaceSwitch}>
          <span className={styles.workspaceMark} aria-hidden="true" />
          <span className={styles.workspaceName}>Unilish Studio</span>
          <span className={styles.workspaceChevron} aria-hidden="true">v</span>
        </div>

        <nav className={styles.sidebarNav} aria-label="Dashboard navigation">
          <div className={styles.navGroup}>
            {primaryItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => {
                  const active = item.match ? item.match(pathname) : isActive;
                  return active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem;
                }}
              >
                <img src={item.icon} alt="" className={styles.navIcon} />
                <span>{item.label}</span>
                {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
              </NavLink>
            ))}
          </div>

        </nav>

        <div className={styles.sidebarCard}>
          <span className={styles.sidebarCardIcon} aria-hidden="true">+</span>
          <p className={styles.sidebarCardTitle}>Invite team members</p>
          <p className={styles.sidebarCardText}>Bring your team in to learn, practice, and review progress together.</p>
        </div>

        <button type="button" className={styles.upgradeButton}>
          <span className={styles.upgradeDot} aria-hidden="true" />
          Upgrade
        </button>
      </aside>

      <header className={styles.header}>
        <div className={styles.pageCrumb}>
          <span className={styles.pageIcon} aria-hidden="true" />
          <span>{getPageTitle(pathname)}</span>
        </div>

        <div className={styles.cta}>
          <button type="button" className={styles.topbarButton}>Feedback</button>
          <button type="button" className={styles.topbarButton}>Docs</button>
          <button type="button" className={styles.topbarButton}>Ask</button>
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

            {isDropdownOpen && (
              <div className={isDropdownOpen ? `${styles.userDropdown} ${styles.userDropdownOpen}` : styles.userDropdown}>
                <UserDropdown onClose={handleCloseDropdown} onLogout={handleLogout} />
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
