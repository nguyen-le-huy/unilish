import axios from 'axios';
import { ENV } from '@/config/env';

export const apiClient = axios.create({
    baseURL: ENV.API_URL,
    withCredentials: true,
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    }
);
