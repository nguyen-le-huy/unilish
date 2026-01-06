export interface User {
    id: string; // Mapped from _id
    _id: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    role: 'student' | 'admin' | 'content_creator';

    // Auth & Identity
    authProvider?: 'local' | 'google' | 'facebook';
    isVerified?: boolean;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phoneNumber?: string;
    bio?: string;
    address?: {
        country: string;
        city: string;
    };

    // Academic
    currentLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    targetLevel?: string;
    placementTestScore?: number;
    weakSkills?: string[];

    // Subscription
    subscription: {
        plan: 'FREE' | 'PLUS' | 'PRO';
        status: 'active' | 'expired' | 'cancelled';
        startDate?: string;
        endDate?: string;
        autoRenew?: boolean;
    };

    // Stats
    stats: {
        xp: number;
        streak: number;
        longestStreak?: number;
        coins: number;
    };

    // Settings
    settings?: {
        notification: boolean;
        nativeLanguage: string;
    };

    createdAt: string;
    updatedAt?: string;
    lastActiveAt?: string;
}

export interface UserFilter {
    page?: number;
    limit?: number;
    search?: string;
    plan?: 'FREE' | 'PLUS' | 'PRO';
    level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    role?: 'student' | 'admin' | 'content_creator';
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface UserResponse {
    users: User[];
    pagination: Pagination;
}

export interface UpdateSubscriptionPayload {
    plan: 'FREE' | 'PLUS' | 'PRO';
    period: 'monthly' | 'yearly';
}

export interface UpdateRolePayload {
    role: 'student' | 'admin' | 'content_creator';
}

export interface UserStatsOverview {
    totalUsers: number;
    premiumUsers: number;
    newUsersToday: number;
    activeLearners: number;
}
