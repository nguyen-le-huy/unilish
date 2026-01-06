import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import LoginPage from "@/pages/auth/LoginPage";
import DashboardHome from "@/pages/dashboard/DashboardHome";
import SettingsPage from "@/pages/system/SettingsPage";
import UsersPage from "@/pages/users/UsersPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { AuthGuard } from "@/components/common/AuthGuard";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export const router = createBrowserRouter([
    // Public Routes
    {
        path: "/auth/login",
        element: <LoginPage />,
    },

    // Protected Routes
    {
        path: "/",
        element: (
            <AuthGuard>
                <AdminLayout />
            </AuthGuard>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: "dashboard",
                element: <DashboardHome />,
            },
            // Placeholder routes
            { path: "courses", element: <PlaceholderPage title="Khóa học (LMS)" /> },
            { path: "lessons", element: <PlaceholderPage title="Bài học" /> },
            { path: "questions", element: <PlaceholderPage title="Kho câu hỏi" /> },
            { path: "videos", element: <PlaceholderPage title="Video / Youtube" /> },
            { path: "news", element: <PlaceholderPage title="Tin tức (News)" /> },
            { path: "users", element: <UsersPage /> },
            { path: "plans", element: <PlaceholderPage title="Gói cước" /> },
            { path: "transactions", element: <PlaceholderPage title="Giao dịch" /> },
            { path: "ai-config", element: <PlaceholderPage title="AI & Prompts" /> },
            { path: "media", element: <PlaceholderPage title="Media / Files" /> },
            { path: "settings", element: <SettingsPage /> },
        ],
    },

    // 404 Route
    {
        path: "*",
        element: <NotFoundPage />,
    },
]);
