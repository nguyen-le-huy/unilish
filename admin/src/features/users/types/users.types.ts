export interface User {
    _id: string;
    email: string;
    googleId?: string;
    authProvider: 'local' | 'google';
    isVerified: boolean;
    role: 'student' | 'admin';

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
    learningGoal?: 'general_communication' | 'exam_thptqg' | 'exam_ielts' | 'exam_toeic' | 'business_work' | 'travel_survival' | string | null;
    learningGoalId?: string | {
        _id: string;
        slug?: string;
        title?: string;
    } | null;
    interests?: string[];
    weakSkills?: string[];
    placementTestScore?: number;
    placementTestDetails?: {
        language: string;
        status: 'in_progress' | 'submitted' | 'expired' | 'cancelled';
        submittedAt?: string;
        durationSeconds?: number | null;
        totalQuestions: number;
        listeningAccuracy: number;
        readingAccuracy: number;
        scoring: {
            listeningCorrect: number;
            listeningTotal: number;
            readingCorrect: number;
            readingTotal: number;
            mcqScoreNormalized: number;
            provisionalCefr: string;
        };
    } | null;

    // System Status

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
    level?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    role?: 'student' | 'admin';
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

export interface UpdateRolePayload {
    role: 'student' | 'admin';
}

export interface UserStatsOverview {
    totalUsers: number;
    newUsersToday: number;
    activeLearners: number;
}
