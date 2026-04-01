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

// Flag to prevent infinite retry loop
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
    failedQueue.forEach((p) => {
        if (error) {
            p.reject(error);
        } else {
            p.resolve(token!);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        const data = response.data;
        if (shouldUnwrapEnvelope(response.config.headers) && isEnvelopeLike(data)) {
            return data.data;
        }
        return data;
    },
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh for 401 errors on non-refresh/non-login endpoints
        const isAuthEndpoint =
            originalRequest?.url?.includes('/auth/refresh') ||
            originalRequest?.url?.includes('/auth/login') ||
            originalRequest?.url?.includes('/auth/logout');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // Queue request while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // POST /auth/refresh — sends refreshToken cookie automatically (withCredentials: true)
                const refreshResponse = await api.post<{ data: { accessToken: string } }>('/auth/refresh');
                const newAccessToken = (refreshResponse as unknown as { data: { accessToken: string } }).data.accessToken
                    ?? (refreshResponse as unknown as { accessToken: string }).accessToken;

                // Update store with new token
                useAuthStore.setState((state) => ({ ...state, token: newAccessToken }));

                processQueue(null, newAccessToken);
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                // Refresh failed → force logout
                useAuthStore.getState().logout();
                window.location.href = '/auth/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);
