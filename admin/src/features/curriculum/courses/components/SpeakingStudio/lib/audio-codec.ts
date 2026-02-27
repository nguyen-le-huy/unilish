import type { SupportedAudioFormat } from '../types/speaking.types';

export const toBase64 = async (blob: Blob): Promise<string> => {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';

    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
};

const downsampleBuffer = (
    input: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number,
): Float32Array => {
    if (inputSampleRate <= outputSampleRate) {
        return input;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.max(1, Math.round(input.length / ratio));
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.min(input.length, Math.round((offsetResult + 1) * ratio));
        let accum = 0;
        let count = 0;
        for (let index = offsetBuffer; index < nextOffsetBuffer; index += 1) {
            accum += input[index];
            count += 1;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult += 1;
        offsetBuffer = nextOffsetBuffer;
    }

    return result;
};

const floatTo16BitPcm = (input: Float32Array): Int16Array => {
    const output = new Int16Array(input.length);
    for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index]));
        output[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    }
    return output;
};

const int16ToBase64 = (pcm: Int16Array): string => {
    const bytes = new Uint8Array(pcm.length * 2);
    for (let index = 0; index < pcm.length; index += 1) {
        const value = pcm[index];
        bytes[index * 2] = value & 0xff;
        bytes[index * 2 + 1] = (value >> 8) & 0xff;
    }

    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary);
};

export const toPcm16Base64 = async (blob: Blob, targetSampleRate = 24_000): Promise<string> => {
    const sourceBuffer = await blob.arrayBuffer();
    const decodeContext = new AudioContext();

    try {
        const decoded = await decodeContext.decodeAudioData(sourceBuffer.slice(0));
        const channelData = decoded.numberOfChannels > 0
            ? decoded.getChannelData(0)
            : new Float32Array(0);
        const mono = new Float32Array(channelData);
        const downsampled = downsampleBuffer(mono, decoded.sampleRate, targetSampleRate);
        const pcm16 = floatTo16BitPcm(downsampled);
        return int16ToBase64(pcm16);
    } finally {
        await decodeContext.close();
    }
};

export const resolveAudioFormat = (mimeType: string): SupportedAudioFormat => {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('webm')) return 'webm';
    if (normalized.includes('ogg')) return 'ogg';
    if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';

    return 'wav';
};

export const decodePcm16Base64 = (audioBase64: string): Float32Array => {
    const binary = atob(audioBase64);
    const sampleCount = Math.floor(binary.length / 2);

    if (sampleCount <= 0) {
        return new Float32Array(0);
    }

    const pcm = new Int16Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
        const low = binary.charCodeAt(index * 2);
        const high = binary.charCodeAt(index * 2 + 1);
        const value = (high << 8) | low;
        pcm[index] = value >= 0x8000 ? value - 0x10000 : value;
    }

    const normalized = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
        normalized[index] = pcm[index] / 32768;
    }

    return normalized;
};
