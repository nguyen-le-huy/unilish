export interface ApiEnvelope<T> {
    status: string;
    code: number;
    message: string;
    data: T;
    meta?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface ApiErrorResponse {
    message?: string;
}