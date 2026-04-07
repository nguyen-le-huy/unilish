export const PATHS = {
    HOME: '/',
    MARKETING: {
        HOME: '/marketing',
    },
    AUTH: {
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        OTP: '/auth/otp',
        SUCCESS: '/auth/success',
        FORGOT_PASSWORD: '/auth/forgot-password',
    },
    DASHBOARD: {
        ROOT: '/dashboard',
        HOME: '/dashboard',
        RESULT: '/dashboard/result',
        WRITING: '/dashboard/writing',
        WRITTING: '/dashboard/writting',
        SPEAKING: '/dashboard/speaking',
        LEARNING: '/dashboard/learning',
        ROADMAP: '/dashboard/roadmap',
        GOAL_SELECTION: '/dashboard/goal-selection',
        LANGUAGE_SELECTION: '/dashboard/language-selection',
        LEVEL_SELECTION: '/dashboard/level-selection',
        PLACEMENT_TEST: {
            ROOT:      '/dashboard/placement-test',
            INTRO:     '/dashboard/placement-test/intro',
            LISTENING: '/dashboard/placement-test/lr',
            WRITING:   '/dashboard/placement-test/writing',
            SPEAKING:  '/dashboard/placement-test/speaking',
            READING:   '/dashboard/placement-test/toeic/reading',
            RESULT:    '/dashboard/placement-test/result',
        },
    }
} as const;
