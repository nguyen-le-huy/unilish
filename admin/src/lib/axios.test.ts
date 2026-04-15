import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockRequestConfig {
    url?: string;
    headers?: Record<string, string>;
    _retry?: boolean;
}

interface MockAxiosError {
    isAxiosError: true;
    response?: {
        status?: number;
    };
    config?: MockRequestConfig;
}

type ResponseRejectedHandler = (error: MockAxiosError) => Promise<unknown>;

type AuthStoreState = {
    token: string | null;
    isAuthenticated: boolean;
    setToken: (token: string | null) => void;
    logout: () => void;
};

const {
    apiClientMock,
    apiClientPostMock,
    getStateMock,
    setTokenMock,
    logoutMock,
    sessionExpiredMock,
    interceptorState,
} = vi.hoisted(() => {
    const retriedRequestMock = vi.fn<(config: unknown) => Promise<unknown>>();
    const postMock = vi.fn<(url: string, body: unknown) => Promise<unknown>>();
    const requestUse = vi.fn();

    const state: {
        rejectedHandler: ResponseRejectedHandler | null;
    } = {
        rejectedHandler: null,
    };

    const responseUse = vi.fn((_: unknown, onRejected: unknown) => {
        if (typeof onRejected === 'function') {
            state.rejectedHandler = onRejected as ResponseRejectedHandler;
        }
        return 0;
    });

    const setToken = vi.fn<(token: string | null) => void>();
    const logout = vi.fn<() => void>();
    const getState = vi.fn<() => AuthStoreState>();

    const sessionExpired = vi.fn<() => void>();

    const client = Object.assign(retriedRequestMock, {
        post: postMock,
        interceptors: {
            request: { use: requestUse },
            response: { use: responseUse },
        },
    });

    return {
        apiClientMock: client,
        apiClientPostMock: postMock,
        getStateMock: getState,
        setTokenMock: setToken,
        logoutMock: logout,
        sessionExpiredMock: sessionExpired,
        interceptorState: state,
    };
});

const authState: AuthStoreState = {
    token: 'expired-token',
    isAuthenticated: true,
    setToken: (token: string | null) => {
        setTokenMock(token);
        authState.token = token;
    },
    logout: () => {
        logoutMock();
        authState.isAuthenticated = false;
        authState.token = null;
    },
};

vi.mock('axios', () => {
    const createMock = vi.fn(() => apiClientMock);

    const axiosMock = {
        create: createMock,
        isAxiosError: (error: unknown): boolean => {
            if (typeof error !== 'object' || error === null) {
                return false;
            }

            const maybeAxiosError = error as Partial<MockAxiosError>;
            return maybeAxiosError.isAxiosError === true;
        },
    };

    return {
        default: axiosMock,
    };
});

vi.mock('@/features/auth', () => ({
    useAuthStore: {
        getState: getStateMock,
    },
}));

vi.mock('@/lib/notification', () => ({
    notify: {
        auth: {
            sessionExpired: sessionExpiredMock,
        },
    },
}));

import './axios';

const buildAxiosError = (status: number | undefined, url: string): MockAxiosError => {
    return {
        isAxiosError: true,
        response: typeof status === 'number' ? { status } : undefined,
        config: {
            url,
            headers: {},
        },
    };
};

describe('admin axios auth interceptor', () => {
    let responseRejectedHandler: ResponseRejectedHandler;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();

        authState.token = 'expired-token';
        authState.isAuthenticated = true;

        getStateMock.mockImplementation(() => authState);

        if (!interceptorState.rejectedHandler) {
            throw new Error('Response interceptor was not registered');
        }

        responseRejectedHandler = interceptorState.rejectedHandler;
    });

    it('refreshes token and retries original request when API returns 401', async () => {
        apiClientPostMock.mockResolvedValueOnce({
            data: {
                status: 'success',
                code: 200,
                message: 'Token refreshed',
                data: {
                    accessToken: 'new-access-token',
                },
            },
        });
        apiClientMock.mockResolvedValueOnce({ data: { ok: true } });

        const originalError = buildAxiosError(401, '/curriculum/languages');

        const result = await responseRejectedHandler(originalError);

        expect(apiClientPostMock).toHaveBeenCalledWith('/auth/refresh', { appType: 'admin' });
        expect(setTokenMock).toHaveBeenCalledWith('new-access-token');
        expect(originalError.config?.headers?.Authorization).toBe('Bearer new-access-token');
        expect(apiClientMock).toHaveBeenCalledWith(originalError.config);
        expect(logoutMock).not.toHaveBeenCalled();
        expect(sessionExpiredMock).not.toHaveBeenCalled();
        expect(result).toEqual({ data: { ok: true } });
    });

    it('logs out and notifies session expiry when refresh token is invalid', async () => {
        apiClientPostMock.mockRejectedValueOnce(buildAxiosError(401, '/auth/refresh'));

        const originalError = buildAxiosError(401, '/curriculum/goals');

        await expect(responseRejectedHandler(originalError)).rejects.toBe(originalError);

        expect(logoutMock).toHaveBeenCalledOnce();
        expect(sessionExpiredMock).toHaveBeenCalledOnce();
    });

    it('retries refresh once for network errors before retrying original request', async () => {
        vi.useFakeTimers();

        apiClientPostMock
            .mockRejectedValueOnce(buildAxiosError(undefined, '/auth/refresh'))
            .mockResolvedValueOnce({
                data: {
                    status: 'success',
                    code: 200,
                    message: 'Token refreshed',
                    data: {
                        accessToken: 'retry-access-token',
                    },
                },
            });

        apiClientMock.mockResolvedValueOnce({ data: { ok: 'retried' } });

        const originalError = buildAxiosError(401, '/settings');
        const pendingResult = responseRejectedHandler(originalError);

        await vi.advanceTimersByTimeAsync(300);
        const result = await pendingResult;

        expect(apiClientPostMock).toHaveBeenCalledTimes(2);
        expect(setTokenMock).toHaveBeenCalledWith('retry-access-token');
        expect(logoutMock).not.toHaveBeenCalled();
        expect(sessionExpiredMock).not.toHaveBeenCalled();
        expect(result).toEqual({ data: { ok: 'retried' } });
    });

    it('does not log out when refresh fails with non-401 server error', async () => {
        apiClientPostMock.mockRejectedValueOnce(buildAxiosError(500, '/auth/refresh'));

        const originalError = buildAxiosError(401, '/users');

        await expect(responseRejectedHandler(originalError)).rejects.toBe(originalError);

        expect(logoutMock).not.toHaveBeenCalled();
        expect(sessionExpiredMock).not.toHaveBeenCalled();
    });

    it('skips refresh flow for auth endpoints', async () => {
        const authRequestError = buildAxiosError(401, '/auth/login');

        await expect(responseRejectedHandler(authRequestError)).rejects.toBe(authRequestError);

        expect(apiClientPostMock).not.toHaveBeenCalled();
        expect(setTokenMock).not.toHaveBeenCalled();
        expect(logoutMock).not.toHaveBeenCalled();
    });
});
