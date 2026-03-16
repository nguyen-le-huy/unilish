import axios, { type AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';

export const api = axios.create({
    baseURL: env.API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

import { useAuthStore } from '@/stores/auth.store';

interface EnvelopeLike<T = unknown> {
    status: string;
    code: number;
    message: string;
    data: T;
}

const isEnvelopeLike = <T = unknown>(value: unknown): value is EnvelopeLike<T> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    return 'status' in value && 'code' in value && 'message' in value && 'data' in value;
};

const shouldUnwrapEnvelope = (headers: unknown): boolean => {
    if (!headers || typeof headers !== 'object') {
        return false;
    }

    const maybeAxiosHeaders = headers as { get?: (key: string) => string | undefined };
    if (typeof maybeAxiosHeaders.get === 'function') {
        return maybeAxiosHeaders.get('x-unilish-unwrap-envelope') === '1';
    }

    const headerMap = headers as Record<string, unknown>;
    return headerMap['x-unilish-unwrap-envelope'] === '1';
};

const withEnvelopeUnwrapHeader = (config?: AxiosRequestConfig): AxiosRequestConfig => {
    return {
        ...config,
        headers: {
            ...(config?.headers as Record<string, unknown> | undefined),
            'x-unilish-unwrap-envelope': '1',
        },
    };
};

/**
 * Type-safe wrapper around `api.get` that auto-unwraps envelope payloads.
 * The second generic on `api.get` overrides the returned type, which is
 * consistent with the response interceptor behavior in this module.
 */
export const apiGetUnwrappedEnvelope = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const data = await api.get<EnvelopeLike<T> | T, EnvelopeLike<T> | T>(url, withEnvelopeUnwrapHeader(config));
    return isEnvelopeLike<T>(data) ? data.data : data;
};

/**
 * Type-safe wrapper around `api.post` that auto-unwraps envelope payloads.
 */
export const apiPostUnwrappedEnvelope = async <T, P = unknown>(
    url: string,
    payload?: P,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const data = await api.post<EnvelopeLike<T> | T, EnvelopeLike<T> | T>(url, payload, withEnvelopeUnwrapHeader(config));
    return isEnvelopeLike<T>(data) ? data.data : data;
};

/**
 * Type-safe wrapper around `api.patch` that auto-unwraps envelope payloads.
 */
export const apiPatchUnwrappedEnvelope = async <T, P = unknown>(
    url: string,
    payload?: P,
    config?: AxiosRequestConfig,
): Promise<T> => {
    const data = await api.patch<EnvelopeLike<T> | T, EnvelopeLike<T> | T>(url, payload, withEnvelopeUnwrapHeader(config));
    return isEnvelopeLike<T>(data) ? data.data : data;
};

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token && token !== 'cookie') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        const data = response.data;
        if (shouldUnwrapEnvelope(response.config.headers) && isEnvelopeLike(data)) {
            return data.data;
        }

        return data;
    },
    (error) => Promise.reject(error)
);
