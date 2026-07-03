import { env } from '@/config/env';

export const getPlayableAudioSources = (rawUrl: string | null | undefined): string[] => {
    const trimmed = rawUrl?.trim();
    if (!trimmed) {
        return [];
    }

    const sources: string[] = [];
    const pushUnique = (value: string) => {
        if (!sources.includes(value)) {
            sources.push(value);
        }
    };

    const normalizedApiBase = env.API_URL.replace(/\/+$/, '');
    const appBase = normalizedApiBase.replace(/\/api$/, '');

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const parsed = new URL(trimmed);
            const key = parsed.pathname.replace(/^\/+/, '');
            const isR2PublicHost =
                parsed.hostname.endsWith('r2.dev')
                || parsed.hostname.includes('r2.cloudflarestorage.com');

            if (key) {
                pushUnique(`${normalizedApiBase}/audio/${key}`);
            }

            if (!isR2PublicHost) {
                pushUnique(trimmed);
            }
        } catch {
            pushUnique(trimmed);
        }

        return sources;
    }

    if (trimmed.startsWith('/')) {
        const noLeadingSlash = trimmed.replace(/^\/+/, '');

        if (noLeadingSlash.startsWith('api/')) {
            pushUnique(`${appBase}/${noLeadingSlash}`);
        } else if (noLeadingSlash.startsWith('audio/')) {
            pushUnique(`${normalizedApiBase}/${noLeadingSlash}`);
        } else {
            pushUnique(`${normalizedApiBase}/audio/${noLeadingSlash}`);
        }

        return sources;
    }

    const key = trimmed.replace(/^\/+/, '');
    pushUnique(`${normalizedApiBase}/audio/${key}`);
    pushUnique(`${appBase}/${key}`);

    return sources;
};
