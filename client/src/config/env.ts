const normalizeApiUrl = (rawUrl: string): string => {
    const trimmed = rawUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const env = {
    API_URL: normalizeApiUrl(import.meta.env.VITE_API_URL || 'http://localhost:5432/api'),
};
