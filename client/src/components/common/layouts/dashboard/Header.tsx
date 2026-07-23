import { useEffect, useRef, useState } from 'react';
import styles from './Dashboard-Layout.module.css';
import unilishLogo from '@/assets/images/Unilish.svg';
import businessIcon from '@/assets/icons/business.svg';
import micIcon from '@/assets/icons/mic.svg';
import penIcon from '@/assets/icons/pen.svg';
import starIcon from '@/assets/icons/star.svg';
import waveIcon from '@/assets/icons/wave.svg';
import globeIcon from '@/assets/icons/globe.svg';
import examIcon from '@/assets/icons/exam.svg';
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
  { label: 'Trang chủ', path: PATHS.DASHBOARD.HOME, icon: globeIcon, match: (pathname) => pathname === PATHS.DASHBOARD.HOME },
  { label: 'Luyện giao tiếp với AI', path: '/dashboard/ai-voice', icon: micIcon },
  {
    label: 'Học với YouTube',
    path: '/dashboard/shadowing',
    icon: waveIcon,
    badge: 'Mới',
    match: (pathname) => pathname.startsWith('/dashboard/shadowing') || pathname.startsWith('/dashboard/dictation'),
  },
  {
    label: 'Luyện đề IELTS',
    path: PATHS.DASHBOARD.IELTS_PRACTICE,
    icon: examIcon,
    match: (pathname) => pathname.startsWith(PATHS.DASHBOARD.IELTS_PRACTICE),
  },
  { label: 'Khóa học đề xuất', path: PATHS.DASHBOARD.RECOMMEND_COURSE, icon: starIcon },
  { label: 'Tất cả khóa học', path: PATHS.DASHBOARD.ALL_COURSES, icon: businessIcon },
  {
    label: 'Kiểm tra trình độ',
    path: PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING,
    icon: penIcon,
    match: (pathname) => pathname.startsWith(PATHS.DASHBOARD.PLACEMENT_TEST.ROOT),
  },
];

const pageTitles: Array<{ match: (pathname: string) => boolean; label: string }> = [
  { match: (pathname) => pathname === PATHS.DASHBOARD.HOME, label: 'Trang chủ' },
  { match: (pathname) => pathname.startsWith('/dashboard/ai-voice'), label: 'Giọng nói AI' },
  { match: (pathname) => pathname.startsWith('/dashboard/shadowing'), label: 'Học với YouTube' },
  { match: (pathname) => pathname.startsWith('/dashboard/dictation'), label: 'Chép chính tả' },
  { match: (pathname) => pathname.startsWith(PATHS.DASHBOARD.IELTS_PRACTICE), label: 'Luyện đề IELTS' },
  { match: (pathname) => pathname.startsWith(PATHS.DASHBOARD.PLACEMENT_TEST.ROOT), label: 'Kiểm tra trình độ' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.RECOMMEND_COURSE, label: 'Khóa học đề xuất' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.ALL_COURSES, label: 'Tất cả khóa học' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.PROFILE, label: 'Trang cá nhân' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.GOAL_SELECTION, label: 'Mục tiêu học tập' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.LANGUAGE_SELECTION, label: 'Ngôn ngữ' },
  { match: (pathname) => pathname === PATHS.DASHBOARD.LEVEL_SELECTION, label: 'Trình độ' },
];

const getPageTitle = (pathname: string) => pageTitles.find((item) => item.match(pathname))?.label ?? 'Bảng điều khiển';

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
        <Link to={PATHS.DASHBOARD.HOME} className={styles.logoLink} aria-label="Đi tới trang chủ">
          <img src={unilishLogo} alt="Unilish logo" className={styles.logo} />
        </Link>

        <div className={styles.workspaceSwitch}>
          <span className={styles.workspaceMark} aria-hidden="true" />
          <span className={styles.workspaceName}>Unilish Studio</span>
        </div>

        <nav className={styles.sidebarNav} aria-label="Điều hướng bảng điều khiển">
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
          <p className={styles.sidebarCardTitle}>Mời thành viên</p>
          <p className={styles.sidebarCardText}>Mời nhóm của bạn cùng học, luyện tập và theo dõi tiến độ.</p>
        </div>

        <button type="button" className={styles.upgradeButton}>
          <span className={styles.upgradeDot} aria-hidden="true" />
          Nâng cấp
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
