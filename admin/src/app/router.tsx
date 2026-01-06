import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import { AuthGuard } from "@/components/common/AuthGuard";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

// Lazy load pages for code splitting
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const SettingsPage = lazy(() => import("@/pages/system/SettingsPage"));
const UsersPage = lazy(() => import("@/pages/users/UsersPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

// Loading fallback component
const PageLoader = () => (
    <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
);

export const router = createBrowserRouter([
    // Public Routes
    {
        path: "/auth/login",
        element: (
            <Suspense fallback={<PageLoader />}>
                <LoginPage />
            </Suspense>
        ),
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
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <DashboardHome />
                    </Suspense>
                ),
            },
            // Placeholder routes
            { path: "courses", element: <PlaceholderPage title="Khóa học (LMS)" /> },
            { path: "lessons", element: <PlaceholderPage title="Bài học" /> },
            { path: "questions", element: <PlaceholderPage title="Kho câu hỏi" /> },
            { path: "videos", element: <PlaceholderPage title="Video / Youtube" /> },
            { path: "news", element: <PlaceholderPage title="Tin tức (News)" /> },
            {
                path: "users",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <UsersPage />
                    </Suspense>
                ),
            },
            { path: "plans", element: <PlaceholderPage title="Gói cước" /> },
            { path: "transactions", element: <PlaceholderPage title="Giao dịch" /> },
            { path: "ai-config", element: <PlaceholderPage title="AI & Prompts" /> },
            { path: "media", element: <PlaceholderPage title="Media / Files" /> },
            {
                path: "settings",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <SettingsPage />
                    </Suspense>
                ),
            },
        ],
    },

    // 404 Route
    {
        path: "*",
        element: (
            <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
            </Suspense>
        ),
    },
]);

