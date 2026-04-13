const normalizeApiUrl = (rawUrl: string): string => {
    const trimmed = rawUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const LOCAL_API_FALLBACK = 'http://localhost:5432/api';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

const resolveApiUrl = (): string => {
    const configuredApiUrl = import.meta.env.VITE_API_URL;

    if (typeof window !== 'undefined' && LOCAL_HOSTNAMES.has(window.location.hostname)) {
        const localApiUrl = import.meta.env.VITE_API_URL_LOCAL || import.meta.env.VITE_API_URL || LOCAL_API_FALLBACK;
        return normalizeApiUrl(localApiUrl);
    }

    return normalizeApiUrl(configuredApiUrl || LOCAL_API_FALLBACK);
};

export const env = {
    API_URL: resolveApiUrl(),
};
