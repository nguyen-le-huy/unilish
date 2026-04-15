import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponApi } from '../api/coupon.api';
import type { CouponQueryParams, ICoupon } from '../types/coupon.types';
import { toast } from 'sonner';

// Query keys for cache management
export const COUPON_QUERY_KEYS = {
    stats: ['coupon', 'stats'] as const,
    list: ['coupon', 'list'] as const,
    detail: (id: string) => ['coupon', 'detail', id] as const,
};

/**
 * Hook to fetch coupon statistics
 */
export const useCouponStats = () => {
    return useQuery({
        queryKey: COUPON_QUERY_KEYS.stats,
        queryFn: couponApi.getStats,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

/**
 * Hook to fetch list of coupons
 */
export const useCoupons = (params?: CouponQueryParams) => {
    return useQuery({
        queryKey: [...COUPON_QUERY_KEYS.list, params],
        queryFn: () => couponApi.getCoupons(params),
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

/**
 * Hook to create a new coupon
 */
export const useCreateCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: couponApi.createCoupon,
        onSuccess: () => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: COUPON_QUERY_KEYS.list });
            queryClient.invalidateQueries({ queryKey: COUPON_QUERY_KEYS.stats });
            toast.success('Coupon created successfully');
        },
        onError: () => {
            toast.error('Failed to create coupon');
        },
    });
};

/**
 * Hook to update an existing coupon
 */
export const useUpdateCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ICoupon> }) =>
            couponApi.updateCoupon(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COUPON_QUERY_KEYS.list });
            queryClient.invalidateQueries({ queryKey: COUPON_QUERY_KEYS.stats });
            toast.success('Coupon updated successfully');
        },
        onError: () => {
            toast.error('Failed to update coupon');
        },
    });
};

/**
 * Hook to delete a coupon
 */
export const useDeleteCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: couponApi.deleteCoupon,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COUPON_QUERY_KEYS.list });
            queryClient.invalidateQueries({ queryKey: COUPON_QUERY_KEYS.stats });
            toast.success('Coupon deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete coupon');
        },
    });
};
