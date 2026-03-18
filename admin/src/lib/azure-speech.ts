import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export interface AzureTokenResponse {
    token: string;
    region: string;
    expiresInSeconds: number;
}

export function createSpeechConfigFromToken({ token, region }: AzureTokenResponse): SpeechSDK.SpeechConfig {
    const config = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
    config.speechRecognitionLanguage = 'en-US';
    config.outputFormat = SpeechSDK.OutputFormat.Detailed;
    return config;
}

export function createPronunciationConfig(
    referenceText: string,
): SpeechSDK.PronunciationAssessmentConfig {
    return new SpeechSDK.PronunciationAssessmentConfig(
        referenceText,
        SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true,
    );
}
