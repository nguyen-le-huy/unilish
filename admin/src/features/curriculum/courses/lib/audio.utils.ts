/**
 * Resolves an audio source to a proxied URL served through the backend.
 *
 * Accepts either:
 *   - An R2 object key   — "audio/vocab/lessonId/item-word.mp3"
 *   - A legacy r2.dev URL — "https://unilish.r2.dev/audio/..."
 *
 * Returns a URL routed through the server audio proxy:
 *   "{API_BASE}/audio/{key}"
 */
export function resolveAudioUrl(src: string): string {
    const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5432/api';
    const base = apiBase.replace(/\/api$/, '');

    // Already a proxy URL — return as-is
    if (src.includes('/api/audio/')) return src;

    // Legacy r2.dev full URL — extract the path as key
    if (src.startsWith('http')) {
        try {
            const url = new URL(src);
            return `${base}/api/audio${url.pathname}`;
        } catch {
            return src;
        }
    }

    // Plain key (new format)
    return `${base}/api/audio/${src}`;
}
