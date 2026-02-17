// ====================================
// DASHBOARD FEATURE - PUBLIC API
// ====================================
// This file defines the public interface of the dashboard feature.
// Only import from this file when using dashboard feature from outside.

// Pages
export { default as DashboardHome } from './pages/DashboardHome/DashboardHome';

// Components (exported for potential reuse)
export { DashboardStats } from './components/DashboardStats/DashboardStats';
export { InteractiveChart } from './components/InteractiveChart/InteractiveChart';
export { RecentUsers } from './components/RecentUsers/RecentUsers';
export { RecentContent } from './components/RecentContent/RecentContent';
export { SystemAlerts } from './components/SystemAlerts/SystemAlerts';

// Hooks
export * from './hooks/useDashboardData';

// Types
export type * from './types/dashboard.types';
