// ====================================
// DASHBOARD FEATURE - TYPE DEFINITIONS
// ====================================

// Stats Types
export interface StatCardData {
    title: string;
    value: string;
    change: number;
    changeLabel: string;
    description: string;
    icon: React.ElementType;
}

// User Types
export interface RecentUser {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'plus' | 'pro';
    joinedAt: string;
}

export type UserPlan = 'free' | 'plus' | 'pro';

// Content Types
export interface ContentItem {
    id: string;
    title: string;
    type: 'course' | 'lesson' | 'video' | 'news';
    status: 'published' | 'draft' | 'pending';
    updatedAt: string;
    author: string;
}

export type ContentType = 'course' | 'lesson' | 'video' | 'news';
export type ContentStatus = 'published' | 'draft' | 'pending';

// Alert Types
export interface SystemAlert {
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    time: string;
}

export type AlertType = 'success' | 'warning' | 'error' | 'info';

// Chart Types
export interface ChartDataPoint {
    date: string;
    desktop: number;
    mobile: number;
}

// Dashboard Summary (API Response)
export interface DashboardSummary {
    stats: StatCardData[];
    recentUsers: RecentUser[];
    recentContent: ContentItem[];
    systemAlerts: SystemAlert[];
    chartData: ChartDataPoint[];
}
