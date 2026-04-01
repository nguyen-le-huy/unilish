import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/axios';

/**
 * useBootstrapAuth
 *
 * Chạy MỘT LẦN khi app khởi động:
 * - Nếu user đã đăng nhập (isAuthenticated = true trong localStorage)
 *   nhưng accessToken bị mất (sau khi refresh trang),
 *   tự động gọi POST /auth/refresh để lấy accessToken mới từ HttpOnly cookie.
 * - Nếu refresh thất bại (cookie hết hạn) → logout.
 */
export const useBootstrapAuth = () => {
    const hasHydrated = useAuthStore((state) => state.hasHydrated);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);
    const hasBoostrapped = useRef(false);

    useEffect(() => {
        if (!hasHydrated) return;

        // Chỉ chạy 1 lần và chỉ khi user đã từng đăng nhập nhưng token bị mất
        if (hasBoostrapped.current) return;
        if (!isAuthenticated || token) return;

        hasBoostrapped.current = true;

        const refresh = async () => {
            try {
                const response = await api.post<{ accessToken: string }>('/auth/refresh');
                const newToken = (response as unknown as { data: { accessToken: string } }).data?.accessToken
                    ?? (response as unknown as { accessToken: string }).accessToken;

                if (newToken) {
                    useAuthStore.setState((state) => ({ ...state, token: newToken }));
                }
            } catch {
                // Cookie hết hạn hoặc không có → logout để clean state
                useAuthStore.getState().logout();
            }
        };

        refresh();
    }, [hasHydrated, isAuthenticated, token]);
};
