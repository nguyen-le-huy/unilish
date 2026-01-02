import axios from 'axios';
import { ENV } from '@/config/env';

export const apiClient = axios.create({
    baseURL: ENV.API_URL,
    withCredentials: true,
});

// Request interceptor - Attach JWT token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('unilish_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401) {
            localStorage.removeItem('unilish_token');
            localStorage.removeItem('unilish_user');
            // Could redirect to login here if needed
        }
        return Promise.reject(error);
    }
);
