export const env = {
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5432/api',
    CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
};
