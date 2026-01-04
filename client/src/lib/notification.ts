import { toast } from 'sonner';

/**
 * Centralized Notification Service for Unilish
 * Following DRY principle - Single source of truth for all toast messages
 * 
 * Usage:
 * import { notify } from '@/lib/notification'
 * notify.auth.loginSuccess()
 */

// Toast duration constants (in milliseconds)
const DURATION = {
    SUCCESS: 3000,
    ERROR: 5000,
    INFO: 3000,
    WARNING: 4000,
    LOADING: Infinity, // No auto-dismiss until resolved
} as const;

export const notify = {
    // ========================
    // AUTHENTICATION TOASTS
    // ========================
    auth: {
        // Login
        loginSuccess: () =>
            toast.success('Đăng nhập thành công!', {
                duration: DURATION.SUCCESS,
            }),

        loginError: (msg?: string) =>
            toast.error(msg || 'Email hoặc mật khẩu không đúng', {
                duration: DURATION.ERROR,
            }),

        // Register
        registerSuccess: () =>
            toast.success('Đăng ký thành công!', {
                duration: DURATION.SUCCESS,
            }),

        registerError: (msg?: string) =>
            toast.error(msg || 'Không thể tạo tài khoản', {
                duration: DURATION.ERROR,
            }),

        // Email Verification (OTP)
        otpSent: (email: string) =>
            toast.info(`Mã OTP đã được gửi đến ${email}`, {
                duration: 4000,
            }),

        otpVerified: () =>
            toast.success('Xác thực email thành công!', {
                duration: DURATION.SUCCESS,
            }),

        otpError: () =>
            toast.error('Mã OTP không hợp lệ', {
                duration: DURATION.ERROR,
            }),

        // Logout
        logoutSuccess: () =>
            toast.success('Đã đăng xuất', {
                duration: DURATION.SUCCESS,
            }),

        // Session
        sessionExpired: () =>
            toast.warning('Phiên đăng nhập hết hạn', {
                duration: DURATION.WARNING,
            }),
    },

    // ========================
    // LEARNING PROGRESS TOASTS
    // ========================
    learning: {
        streakSaved: (days: number) =>
            toast.success(`Tuyệt vời! Bạn đã đạt chuỗi ${days} ngày liên tiếp.`, {
                duration: DURATION.SUCCESS,
            }),

        levelUp: (level: number) =>
            toast.success(`Bạn đã mở khóa các tính năng mới ở cấp độ ${level}!`, {
                duration: 4000,
            }),

        coinEarned: (coins: number) =>
            toast.success(`Tiếp tục học để kiếm thêm xu! (+${coins})`, {
                duration: DURATION.SUCCESS,
            }),

        lessonCompleted: (xp: number) =>
            toast.success(`Bạn đã nhận được +${xp} EXP từ bài học này.`, {
                duration: DURATION.SUCCESS,
            }),

        quizPassed: (score: number) =>
            toast.success(score >= 80 ? 'Xuất sắc! Bạn đã nắm vững kiến thức.' : 'Tốt lắm! Hãy ôn tập thêm để cải thiện.', {
                duration: 4000,
            }),

        quizFailed: () =>
            toast.warning('Đừng nản lòng! Hãy xem lại bài học và thử lại.', {
                duration: DURATION.WARNING,
            }),
    },

    // ========================
    // NETWORK & SYSTEM TOASTS
    // ========================
    network: {
        offline: () =>
            toast.error('Kiểm tra kết nối Internet của bạn', {
                duration: DURATION.ERROR,
            }),

        online: () =>
            toast.success('Bạn đã online trở lại', {
                duration: DURATION.SUCCESS,
            }),

        serverError: () =>
            toast.error('Đã xảy ra lỗi. Vui lòng thử lại sau.', {
                duration: DURATION.ERROR,
            }),

        timeout: () =>
            toast.error('Máy chủ phản hồi chậm. Vui lòng thử lại.', {
                duration: DURATION.ERROR,
            }),
    },

    // ========================
    // PROFILE & SETTINGS TOASTS
    // ========================
    profile: {
        updateSuccess: () =>
            toast.success('Thông tin của bạn đã được lưu', {
                duration: DURATION.SUCCESS,
            }),

        updateError: () =>
            toast.error('Không thể lưu thay đổi. Vui lòng thử lại.', {
                duration: DURATION.ERROR,
            }),

        avatarUploaded: () =>
            toast.success('Đã cập nhật ảnh đại diện', {
                duration: DURATION.SUCCESS,
            }),
    },

    // ========================
    // GENERAL PURPOSE TOASTS
    // ========================
    general: {
        success: (msg: string) =>
            toast.success(msg, {
                duration: DURATION.SUCCESS,
            }),

        error: (msg: string) =>
            toast.error(msg, {
                duration: DURATION.ERROR,
            }),

        info: (msg: string) =>
            toast.info(msg, {
                duration: DURATION.INFO,
            }),

        warning: (msg: string) =>
            toast.warning(msg, {
                duration: DURATION.WARNING,
            }),

        loading: (msg: string) =>
            toast.loading(msg),

        // Dismiss a specific toast by ID
        dismiss: (toastId: string | number) =>
            toast.dismiss(toastId),

        // Dismiss all toasts
        dismissAll: () =>
            toast.dismiss(),
    },

    // ========================
    // PROMISE-BASED TOASTS
    // For async operations with loading -> success/error states
    // ========================
    promise: <T>(
        promise: Promise<T>,
        options: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((err: Error) => string);
        }
    ) =>
        toast.promise(promise, {
            loading: options.loading,
            success: options.success,
            error: options.error,
        }),
};

// Type export for TypeScript support
export type NotifyService = typeof notify;
