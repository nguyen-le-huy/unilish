// ─── Audio URL Resolver ───────────────────────────────────────────────────────
// Translates raw R2 object URLs into the server-proxied audio endpoint
// so browsers can stream without cross-origin issues.

export function resolveAudioPreviewUrl(rawUrl: string): string {
    const audioUrl = rawUrl.trim();
    if (!audioUrl) return '';

    // Only proxy R2 URLs; pass everything else straight through
    if (!audioUrl.includes('.r2.dev/')) return audioUrl;

    const apiBaseRaw = String(import.meta.env.VITE_API_URL || 'http://localhost:5432/api');
    const apiBase = apiBaseRaw.endsWith('/') ? apiBaseRaw.slice(0, -1) : apiBaseRaw;

    try {
        const parsed = new URL(audioUrl);
        const key = parsed.pathname.replace(/^\//, '');
        if (!key) return audioUrl;
        return `${apiBase}/audio/${key}`;
    } catch {
        return audioUrl;
    }
}
