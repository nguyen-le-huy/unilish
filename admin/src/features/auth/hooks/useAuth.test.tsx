import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/auth';

interface AuthStoreSlice {
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

const {
    navigateMock,
    setAuthMock,
    logoutStoreMock,
    loginApiMock,
    logoutApiMock,
    loginSuccessMock,
    loginErrorMock,
    accessDeniedMock,
    logoutSuccessMock,
    generalErrorMock,
} = vi.hoisted(() => {
    return {
        navigateMock: vi.fn<(path: string, options?: { replace?: boolean }) => void>(),
        setAuthMock: vi.fn<(user: User, token: string) => void>(),
        logoutStoreMock: vi.fn<() => void>(),
        loginApiMock: vi.fn<(payload: { email: string; password: string }) => Promise<unknown>>(),
        logoutApiMock: vi.fn<() => Promise<void>>(),
        loginSuccessMock: vi.fn<() => void>(),
        loginErrorMock: vi.fn<(message?: string) => void>(),
        accessDeniedMock: vi.fn<() => void>(),
        logoutSuccessMock: vi.fn<() => void>(),
        generalErrorMock: vi.fn<(message: string) => void>(),
    };
});

const storeSlice: AuthStoreSlice = {
    setAuth: (user: User, token: string) => {
        setAuthMock(user, token);
    },
    logout: () => {
        logoutStoreMock();
    },
};

const useAuthStoreMock = vi.hoisted(() => {
    return vi.fn((selector: (state: AuthStoreSlice) => unknown) => {
        return selector(storeSlice);
    });
});

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => navigateMock,
    };
});

vi.mock('../store/auth.store', () => ({
    useAuthStore: useAuthStoreMock,
}));

vi.mock('../api/auth.api', () => ({
    loginApi: loginApiMock,
    logoutApi: logoutApiMock,
}));

vi.mock('@/lib/notification', () => ({
    notify: {
        auth: {
            loginSuccess: loginSuccessMock,
            loginError: loginErrorMock,
            accessDenied: accessDeniedMock,
            logoutSuccess: logoutSuccessMock,
        },
        general: {
            error: generalErrorMock,
        },
    },
}));

import { useLogin, useLogout } from './useAuth';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

const adminUser: User = {
    _id: 'admin-1',
    email: 'admin@unilish.vn',
    fullName: 'Admin User',
    role: 'admin',
};

describe('useAuth hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('stores auth state and navigates to dashboard when admin login succeeds', async () => {
        loginApiMock.mockResolvedValueOnce({
            status: 'success',
            code: 200,
            message: 'Đăng nhập thành công',
            data: {
                user: adminUser,
                accessToken: 'admin-access-token',
            },
        });

        const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.mutateAsync({
                email: 'admin@unilish.vn',
                password: 'secret123',
            });
        });

        expect(setAuthMock).toHaveBeenCalledWith(adminUser, 'admin-access-token');
        expect(loginSuccessMock).toHaveBeenCalledOnce();
        expect(navigateMock).toHaveBeenCalledWith('/dashboard');
        expect(accessDeniedMock).not.toHaveBeenCalled();
    });

    it('rejects non-admin users even if login API succeeds', async () => {
        loginApiMock.mockResolvedValueOnce({
            status: 'success',
            code: 200,
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    ...adminUser,
                    role: 'student' as const,
                },
                accessToken: 'student-token',
            },
        });

        const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.mutateAsync({
                email: 'student@unilish.vn',
                password: 'secret123',
            });
        });

        expect(accessDeniedMock).toHaveBeenCalledOnce();
        expect(setAuthMock).not.toHaveBeenCalled();
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it('shows login error when token is missing from API response', async () => {
        loginApiMock.mockResolvedValueOnce({
            status: 'success',
            code: 200,
            message: 'Đăng nhập thành công',
            data: {
                user: adminUser,
            },
        });

        const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

        await act(async () => {
            await result.current.mutateAsync({
                email: 'admin@unilish.vn',
                password: 'secret123',
            });
        });

        expect(loginErrorMock).toHaveBeenCalledWith('Không nhận được access token từ server');
        expect(setAuthMock).not.toHaveBeenCalled();
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it('surfaces API login error message', async () => {
        const apiError = new Error('Login failed') as Error & {
            response?: {
                data?: {
                    message?: string;
                };
            };
        };
        apiError.response = {
            data: {
                message: 'Email hoặc mật khẩu không đúng',
            },
        };
        loginApiMock.mockRejectedValueOnce(apiError);

        const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

        await act(async () => {
            await expect(result.current.mutateAsync({
                email: 'admin@unilish.vn',
                password: 'wrong-password',
            })).rejects.toBe(apiError);
        });

        expect(loginErrorMock).toHaveBeenCalledWith('Email hoặc mật khẩu không đúng');
    });

    it('calls logout API then clears local auth state', async () => {
        logoutApiMock.mockResolvedValueOnce();

        const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

        await act(async () => {
            await result.current();
        });

        expect(logoutApiMock).toHaveBeenCalledOnce();
        expect(logoutStoreMock).toHaveBeenCalledOnce();
        expect(logoutSuccessMock).toHaveBeenCalledOnce();
        expect(navigateMock).toHaveBeenCalledWith('/auth/login', { replace: true });
        expect(generalErrorMock).not.toHaveBeenCalled();
    });

    it('still logs out locally when logout API fails', async () => {
        logoutApiMock.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

        await act(async () => {
            await result.current();
        });

        expect(generalErrorMock).toHaveBeenCalledWith('Không thể đồng bộ đăng xuất với máy chủ');
        expect(logoutStoreMock).toHaveBeenCalledOnce();
        expect(logoutSuccessMock).toHaveBeenCalledOnce();
        expect(navigateMock).toHaveBeenCalledWith('/auth/login', { replace: true });
    });
});
