export const PATHS = {
    HOME: '/',
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        OTP: '/auth/otp',
        FORGOT_PASSWORD: '/auth/forgot-password',
    },
    DASHBOARD: {
        ROOT: '/dashboard',
        HOME: '/dashboard',
        LEARNING: '/dashboard/learning',
    }
} as const;
