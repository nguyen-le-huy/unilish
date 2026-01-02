export interface User {
    _id: string;
    email: string;
    fullName: string;
    role: 'student' | 'admin' | 'content_creator';
    avatarUrl?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}
