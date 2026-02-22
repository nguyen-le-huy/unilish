/**
 * Standard API response envelope used across all Unilish backend endpoints.
 */
export interface ApiResponse<T> {
    status: string;
    code: number;
    message: string;
    data: T;
    /** Present on paginated list endpoints. */
    meta?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
