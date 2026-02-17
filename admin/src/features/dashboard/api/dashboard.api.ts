import type {
    DashboardSummary,
    StatCardData,
    RecentUser,
    ContentItem,
    SystemAlert,
    ChartDataPoint,
} from '../types/dashboard.types';
import { CreditCard, Users, Activity, BookOpen } from 'lucide-react';

// ====================================
// MOCK DATA (Replace with real API calls)
// ====================================

const mockStats: StatCardData[] = [
    {
        title: "Doanh thu tháng",
        value: "₫45,250,000",
        change: 12.5,
        changeLabel: "Tăng so với tháng trước",
        description: "Tổng doanh thu từ gói cước",
        icon: CreditCard,
    },
    {
        title: "Học viên mới",
        value: "1,234",
        change: -8,
        changeLabel: "Giảm 8% so với tháng trước",
        description: "Cần tăng cường marketing",
        icon: Users,
    },
    {
        title: "Học viên hoạt động",
        value: "15,678",
        change: 15.2,
        changeLabel: "Tỷ lệ retention tốt",
        description: "Số user học trong 7 ngày qua",
        icon: Activity,
    },
    {
        title: "Bài học hoàn thành",
        value: "8,542",
        change: 22.5,
        changeLabel: "Tăng mạnh so với tuần trước",
        description: "Số lesson được complete",
        icon: BookOpen,
    },
];

const mockRecentUsers: RecentUser[] = [
    { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', plan: 'pro', joinedAt: '2 phút trước' },
    { id: '2', name: 'Trần Thị B', email: 'tranthib@gmail.com', plan: 'plus', joinedAt: '15 phút trước' },
    { id: '3', name: 'Lê Văn C', email: 'levanc@gmail.com', plan: 'free', joinedAt: '1 giờ trước' },
    { id: '4', name: 'Phạm Thị D', email: 'phamthid@gmail.com', plan: 'pro', joinedAt: '2 giờ trước' },
    { id: '5', name: 'Hoàng Văn E', email: 'hoangvane@gmail.com', plan: 'free', joinedAt: '3 giờ trước' },
];

const mockRecentContent: ContentItem[] = [
    { id: '1', title: 'IELTS Speaking Part 2 - Describe a Person', type: 'lesson', status: 'published', updatedAt: '10 phút trước', author: 'Admin' },
    { id: '2', title: 'TED Talk: The Power of Vulnerability', type: 'video', status: 'pending', updatedAt: '30 phút trước', author: 'Content Editor' },
    { id: '3', title: 'CNN News: Climate Change Impact', type: 'news', status: 'draft', updatedAt: '1 giờ trước', author: 'AI Generated' },
    { id: '4', title: 'Unit 5: Business English - Meetings', type: 'course', status: 'published', updatedAt: '2 giờ trước', author: 'Admin' },
    { id: '5', title: 'Grammar: Past Perfect Tense', type: 'lesson', status: 'published', updatedAt: '3 giờ trước', author: 'Content Editor' },
];

const mockSystemAlerts: SystemAlert[] = [
    { id: '1', type: 'success', title: 'Backup hoàn tất', message: 'Database backup lúc 02:00 AM thành công', time: '6 giờ trước' },
    { id: '2', type: 'warning', title: 'Dung lượng R2', message: 'Storage sử dụng 85% - cần theo dõi', time: '1 ngày trước' },
    { id: '3', type: 'info', title: 'AI Model cập nhật', message: 'GPT-4o-mini đã được kích hoạt cho Speaking Coach', time: '2 ngày trước' },
    { id: '4', type: 'error', title: 'Email service', message: 'n8n webhook timeout - đã tự động retry', time: '3 ngày trước' },
];

// Simplified chart data (90 days)
const mockChartData: ChartDataPoint[] = Array.from({ length: 90 }, (_, i) => ({
    date: new Date(2024, 3, i + 1).toISOString().split('T')[0],
    desktop: Math.floor(Math.random() * 400) + 100,
    mobile: Math.floor(Math.random() * 400) + 100,
}));

// ====================================
// API FUNCTIONS
// ====================================

/**
 * Fetch dashboard summary data
 * @returns Complete dashboard data
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // TODO: Replace with real API call
    // const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    // return response.data;

    return {
        stats: mockStats,
        recentUsers: mockRecentUsers,
        recentContent: mockRecentContent,
        systemAlerts: mockSystemAlerts,
        chartData: mockChartData,
    };
};

/**
 * Fetch only stats data
 */
export const getStatsData = async (): Promise<StatCardData[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockStats;
};

/**
 * Fetch only chart data
 */
export const getChartData = async (): Promise<ChartDataPoint[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockChartData;
};

/**
 * Fetch recent users
 */
export const getRecentUsers = async (): Promise<RecentUser[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockRecentUsers;
};

/**
 * Fetch recent content
 */
export const getRecentContent = async (): Promise<ContentItem[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockRecentContent;
};

/**
 * Fetch system alerts
 */
export const getSystemAlerts = async (): Promise<SystemAlert[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockSystemAlerts;
};
