/**
 * Standard API response envelope used across all Unilish backend endpoints.
 */
export interface ApiResponse<T> {
    status: string;
    code: number;
    message: string;
    data: T;
}
