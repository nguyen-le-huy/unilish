/**
 * Normalizes a raw string input into a BCP 47 language tag.
 * Examples: "en" -> "en", "en-us" -> "en-US", "EN-US" -> "en-US"
 */
export const toLanguageCode = (value: string): string => {
    const raw = value.trim();
    const parts = raw.split('-');

    if (parts.length === 1) {
        return parts[0]?.toLowerCase() ?? '';
    }

    const language = parts[0]?.toLowerCase() ?? '';
    const region = parts[1]?.toUpperCase() ?? '';
    return `${language}-${region}`;
};

/**
 * Decodes a base64-encoded audio payload and plays it in the browser.
 */
export const playAudioBase64 = async (mimeType: string, audioBase64: string): Promise<void> => {
    const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
    await audio.play();
};
