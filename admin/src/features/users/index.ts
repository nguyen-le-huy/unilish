// ====================================
// USERS FEATURE - PUBLIC API
// ====================================

// Pages
export { default as UsersPage } from './pages/UsersPage/UsersPage';

// Components (exported for potential reuse)
export { UserActionMenu } from './components/UserActionMenu/UserActionMenu';
export { UserDetailsSheet } from './components/UserDetailsSheet/UserDetailsSheet';
export { UserFilterBar } from './components/UserFilter/UserFilter';
export { UserRoleModal } from './components/UserRoleModal/UserRoleModal';
export { UserStatsCards } from './components/UserStatsCards/UserStatsCards';
export { UserSubscriptionModal } from './components/UserSubscriptionModal/UserSubscriptionModal';
export { UserTable } from './components/UserTable/UserTable';

// Hooks
export * from './hooks/useUsers';

// Types
export type * from './types/users.types';

// API (optional - usually internal)
// export { userApi } from './api/user.api';
