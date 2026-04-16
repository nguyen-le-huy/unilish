import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { notify } from '@/lib/notification';
import { useAuthStore } from '@/features/auth';

const normalizeApiBaseUrl = (rawBaseUrl: string): string => {
    const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
    if (trimmed.endsWith('/api')) {
        return trimmed;
    }

    return trimmed + '/api';
};

const apiClient = axios.create({
    baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:5432/api'),
    withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

interface RefreshTokenResponseEnvelope {
    status: string;
    code: number;
    message: string;
    data?: {
        accessToken?: string;
        token?: string;
    };
}

type RefreshFailureReason = 'session_invalid' | 'network' | 'unknown';

class RefreshTokenError extends Error {
    readonly reason: RefreshFailureReason;
    readonly statusCode?: number;

    constructor(reason: RefreshFailureReason, message: string, statusCode?: number) {
        super(message);
        this.name = 'RefreshTokenError';
        this.reason = reason;
        this.statusCode = statusCode;
    }
}

const isAxiosNetworkError = (error: AxiosError): boolean => {
    return !error.response;
};

const classifyRefreshError = (error: unknown): RefreshTokenError => {
    if (error instanceof RefreshTokenError) {
        return error;
    }

    if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;

        if (statusCode === 401) {
            return new RefreshTokenError('session_invalid', 'Phiên đăng nhập đã hết hạn', statusCode);
        }

        if (isAxiosNetworkError(error)) {
            return new RefreshTokenError('network', 'Không thể kết nối tới máy chủ để làm mới phiên');
        }

        return new RefreshTokenError('unknown', 'Không thể làm mới phiên đăng nhập', statusCode);
    }

    return new RefreshTokenError('unknown', 'Không thể làm mới phiên đăng nhập');
};

const wait = (delayMs: number): Promise<void> => {
    return new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
    });
};

const resolveAccessTokenFromRefresh = (response: RefreshTokenResponseEnvelope): string => {
    const nextToken = response.data?.accessToken ?? response.data?.token;

    if (!nextToken) {
        throw new RefreshTokenError('session_invalid', 'Phiên đăng nhập đã hết hạn', 401);
    }

    return nextToken;
};

const applyAccessToken = (token: string): void => {
    useAuthStore.getState().setToken(token);
};

const requestAccessTokenRefresh = async (): Promise<string> => {
    const { refreshToken } = useAuthStore.getState();
    const response = await apiClient.post<RefreshTokenResponseEnvelope>('/auth/refresh', {
        appType: 'admin',
        ...(refreshToken ? { refreshToken } : {}),
    });
    const nextToken = resolveAccessTokenFromRefresh(response.data);
    applyAccessToken(nextToken);
    return nextToken;
};

let refreshTokenPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
    if (!refreshTokenPromise) {
        refreshTokenPromise = (async () => {
            try {
                return await requestAccessTokenRefresh();
            } catch (error) {
                const classifiedError = classifyRefreshError(error);

                if (classifiedError.reason !== 'network') {
                    throw classifiedError;
                }

                await wait(300);

                try {
                    return await requestAccessTokenRefresh();
                } catch (retryError) {
                    throw classifyRefreshError(retryError);
                }
            } finally {
                refreshTokenPromise = null;
            }
        })();
    }

    return refreshTokenPromise;
};

const handleSessionExpired = (): void => {
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated) {
        return;
    }

    authState.logout();
    notify.auth.sessionExpired();
};

apiClient.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = 'Bearer ' + token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as RetriableRequestConfig | undefined;
        const status = error.response?.status as number | undefined;
        const requestUrl = String(originalRequest?.url ?? '');
        const isRefreshRequest = requestUrl.includes('/auth/refresh');
        const isAuthRequest = requestUrl.includes('/auth/login')
            || requestUrl.includes('/auth/logout')
            || requestUrl.includes('/auth/register')
            || requestUrl.includes('/auth/verify-otp')
            || isRefreshRequest;

        if (
            status === 401
            && originalRequest
            && !originalRequest._retry
            && !isAuthRequest
        ) {
            originalRequest._retry = true;

            try {
                const nextToken = await refreshAccessToken();
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = 'Bearer ' + nextToken;
                return apiClient(originalRequest);
            } catch (refreshError) {
                const classifiedError = classifyRefreshError(refreshError);

                if (classifiedError.reason === 'session_invalid') {
                    handleSessionExpired();
                }

                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
