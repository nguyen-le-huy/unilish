// ====================================
// COUPON FEATURE - PUBLIC API
// ====================================

// Pages
export { default as CouponPage } from './pages/CouponPage/CouponPage';

// Components (exported for potential reuse)
export { CouponStats } from './components/CouponStats/CouponStats';
export { CouponTable } from './components/CouponTable/CouponTable';
export { CouponFormModal } from './components/CouponFormModal/CouponFormModal';

// Hooks
export * from './hooks/useCouponData';

// Types
export type * from './types/coupon.types';

// API (optional - usually internal, but exported for advanced use cases)
// export { couponApi } from './api/coupon.api';
