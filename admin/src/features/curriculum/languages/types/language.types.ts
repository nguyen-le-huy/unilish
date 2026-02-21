import type { TTS_PROVIDERS } from '../constants/tts.constants';

export type TTSProvider = (typeof TTS_PROVIDERS)[number];

export interface TtsConfig {
    provider: TTSProvider;
    voiceId?: string | null;
    style?: string | null;
    speed: number;
}

export interface TtsConfigInput {
    provider?: TTSProvider;
    voiceId?: string;
    style?: string;
    speed?: number;
}

export interface Language {
    _id: string;
    code: string;
    name: string;
    nativeName: string;
    flagIconUrl?: string | null;
    isActive: boolean;
    ttsConfig: TtsConfig;
    createdAt: string;
    updatedAt: string;
}

export interface LanguageListQuery {
    isActive?: boolean;
    search?: string;
}

export interface CreateLanguagePayload {
    code: string;
    name: string;
    nativeName: string;
    flagIconUrl?: string;
    ttsConfig: Omit<TtsConfig, 'voiceId' | 'style'> & { voiceId?: string; style?: string };
    isActive: boolean;
}

export interface UpdateLanguagePayload {
    name?: string;
    nativeName?: string;
    flagIconUrl?: string | null;
    ttsConfig?: TtsConfigInput;
    isActive?: boolean;
}

export interface TestVoicePayload {
    text: string;
    provider: TTSProvider;
    voiceId: string;
    style?: string;
    speed: number;
}

export interface TestVoiceResult {
    mimeType: string;
    audioBase64: string;
}
