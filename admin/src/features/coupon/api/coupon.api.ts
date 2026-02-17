import apiClient from '@/lib/axios';
import type { ICoupon, CouponStats } from '../types/coupon.types';

export const couponApi = {
    getStats: async (): Promise<CouponStats> => {
        const response = await apiClient.get('/coupons/stats');
        return response.data.data;
    },

    getCoupons: async (params?: any): Promise<ICoupon[]> => {
        const response = await apiClient.get('/coupons', { params });
        return response.data.data;
    },

    createCoupon: async (data: Partial<ICoupon>): Promise<ICoupon> => {
        const response = await apiClient.post('/coupons', data);
        return response.data.data;
    },

    updateCoupon: async (id: string, data: Partial<ICoupon>): Promise<ICoupon> => {
        const response = await apiClient.put(`/coupons/${id}`, data);
        return response.data.data;
    },

    deleteCoupon: async (id: string): Promise<void> => {
        await apiClient.delete(`/coupons/${id}`);
    },
};
