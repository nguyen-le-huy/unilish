import axios from 'axios';
import { env } from '@/config/env';

export const api = axios.create({
    baseURL: env.API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

import { useAuthStore } from '@/stores/auth.store';

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token && token !== 'cookie') {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
);
