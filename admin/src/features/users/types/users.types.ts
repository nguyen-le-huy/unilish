export interface User {
    _id: string;
    email: string;
    googleId?: string;
    authProvider: 'local' | 'google';
    isVerified: boolean;
    role: 'student' | 'admin' | 'content_creator';

    // Profile
    fullName: string;
    avatarUrl: string;
    dateOfBirth?: string; // Date string
    phoneNumber?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    lastActiveAt?: string; // Date string

    // Contextual Learning
    currentLevel: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    targetLevel: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    learningGoal: 'general_communication' | 'exam_thptqg' | 'exam_ielts' | 'exam_toeic' | 'business_work' | 'travel_survival' | string;
    interests?: string[];
    weakSkills?: string[];
    placementTestScore?: number;

    // System Status
    subscription: {
        plan: 'FREE' | 'PREMIUM';
        endDate?: string; // Date string
        status: 'active' | 'expired';
    };

    settings?: {
        notification: boolean;
        dailyGoalMinutes: number;
    };

    isSyncedToGraph: boolean;

    createdAt: string;
    updatedAt: string;
}

export interface UserFilter {
    page?: number;
    limit?: number;
    search?: string;
    plan?: 'FREE' | 'PREMIUM';
    level?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
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
    plan: 'FREE' | 'PREMIUM';
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
