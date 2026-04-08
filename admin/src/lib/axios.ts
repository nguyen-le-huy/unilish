import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth';


const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5432/api',
    withCredentials: true,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

let refreshTokenPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
    if (!refreshTokenPromise) {
        refreshTokenPromise = apiClient
            .post('/auth/refresh', { appType: 'admin' })
            .then((response: { data?: { data?: { accessToken?: string } } }) => {
                const nextToken = response.data?.data?.accessToken ?? null;
                const currentUser = useAuthStore.getState().user;

                if (nextToken && currentUser) {
                    useAuthStore.getState().setAuth(currentUser, nextToken);
                    return nextToken;
                }

                return null;
            })
            .catch(() => null)
            .finally(() => {
                refreshTokenPromise = null;
            });
    }

    return refreshTokenPromise;
};

apiClient.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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

        if (
            status === 401
            && originalRequest
            && !originalRequest._retry
            && !isRefreshRequest
        ) {
            originalRequest._retry = true;

            const nextToken = await refreshAccessToken();
            if (nextToken) {
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = `Bearer ${nextToken}`;
                return apiClient(originalRequest);
            }
        }

        if (status === 401) {
            useAuthStore.getState().logout();
        }

        return Promise.reject(error);
    }
);

export default apiClient;
