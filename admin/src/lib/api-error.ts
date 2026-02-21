import type { AxiosError } from 'axios';

/**
 * Extracts a human-readable error message from an Axios error response.
 * Falls back to the provided `fallback` string if no message is found.
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? fallback;
};
