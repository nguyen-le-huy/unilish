import { toast } from 'sonner';

/**
 * Centralized Notification Service for Admin
 */

const DURATION = {
    SUCCESS: 3000,
    ERROR: 5000,
    INFO: 3000,
    WARNING: 4000,
} as const;

export const notify = {
    auth: {
        loginSuccess: () =>
            toast.success('Đăng nhập thành công!', {
                duration: DURATION.SUCCESS,
            }),

        loginError: (msg?: string) =>
            toast.error(msg || 'Email hoặc mật khẩu không đúng', {
                duration: DURATION.ERROR,
            }),

        accessDenied: () =>
            toast.error('Bạn không có quyền truy cập Admin', {
                duration: DURATION.ERROR,
            }),

        logoutSuccess: () =>
            toast.success('Đã đăng xuất', {
                duration: DURATION.SUCCESS,
            }),

        sessionExpired: () =>
            toast.warning('Phiên đăng nhập hết hạn', {
                duration: DURATION.WARNING,
            }),
    },

    general: {
        success: (msg: string) =>
            toast.success(msg, { duration: DURATION.SUCCESS }),

        error: (msg: string) =>
            toast.error(msg, { duration: DURATION.ERROR }),

        info: (msg: string) =>
            toast.info(msg, { duration: DURATION.INFO }),
    },
};
