export interface LevelIcons {
    [key: string]: string; // e.g., "A1": "https://..."
}

export interface SystemSetting {
    key: string;
    value: unknown;
    description?: string;
}

export interface ImageUploadResult {
    url: string;
    publicId: string;
    [key: string]: unknown;
}

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = typeof LEVELS[number];
