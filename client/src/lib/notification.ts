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
            toast.success(`🔥 Streak ${days} ngày!`, {
                description: 'Tuyệt vời! Hãy duy trì nhịp độ học tập này.',
                duration: DURATION.SUCCESS,
            }),

        levelUp: (level: number) =>
            toast.success(`🎉 Lên cấp ${level}!`, {
                description: 'Bạn đã mở khóa các tính năng mới',
                duration: 4000,
            }),

        coinEarned: (coins: number) =>
            toast.success(`💰 +${coins} Xu`, {
                description: 'Tiếp tục học để kiếm thêm xu!',
                duration: DURATION.SUCCESS,
            }),

        lessonCompleted: (xp: number) =>
            toast.success('✅ Hoàn thành bài học!', {
                description: `Bạn đã nhận được +${xp} EXP`,
                duration: DURATION.SUCCESS,
            }),

        quizPassed: (score: number) =>
            toast.success(`🎯 Điểm số: ${score}/100`, {
                description: score >= 80 ? 'Xuất sắc! Bạn đã nắm vững kiến thức.' : 'Tốt lắm! Hãy ôn tập thêm để cải thiện.',
                duration: 4000,
            }),

        quizFailed: (score: number) =>
            toast.warning(`📝 Điểm số: ${score}/100`, {
                description: 'Đừng nản lòng! Hãy xem lại bài học và thử lại.',
                duration: DURATION.WARNING,
            }),
    },

    // ========================
    // NETWORK & SYSTEM TOASTS
    // ========================
    network: {
        offline: () =>
            toast.error('📡 Mất kết nối mạng', {
                description: 'Kiểm tra kết nối Internet của bạn',
                duration: DURATION.ERROR,
            }),

        online: () =>
            toast.success('📶 Đã kết nối lại', {
                description: 'Bạn đã online trở lại',
                duration: DURATION.SUCCESS,
            }),

        serverError: () =>
            toast.error('⚠️ Lỗi máy chủ', {
                description: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
                duration: DURATION.ERROR,
            }),

        timeout: () =>
            toast.error('⏱️ Yêu cầu quá thời gian', {
                description: 'Máy chủ phản hồi chậm. Vui lòng thử lại.',
                duration: DURATION.ERROR,
            }),
    },

    // ========================
    // PROFILE & SETTINGS TOASTS
    // ========================
    profile: {
        updateSuccess: () =>
            toast.success('✅ Cập nhật thành công!', {
                description: 'Thông tin của bạn đã được lưu',
                duration: DURATION.SUCCESS,
            }),

        updateError: () =>
            toast.error('❌ Cập nhật thất bại', {
                description: 'Không thể lưu thay đổi. Vui lòng thử lại.',
                duration: DURATION.ERROR,
            }),

        avatarUploaded: () =>
            toast.success('📷 Đã cập nhật ảnh đại diện', {
                duration: DURATION.SUCCESS,
            }),
    },

    // ========================
    // GENERAL PURPOSE TOASTS
    // ========================
    general: {
        success: (msg: string, description?: string) =>
            toast.success(msg, {
                description,
                duration: DURATION.SUCCESS,
            }),

        error: (msg: string, description?: string) =>
            toast.error(msg, {
                description,
                duration: DURATION.ERROR,
            }),

        info: (msg: string, description?: string) =>
            toast.info(msg, {
                description,
                duration: DURATION.INFO,
            }),

        warning: (msg: string, description?: string) =>
            toast.warning(msg, {
                description,
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
