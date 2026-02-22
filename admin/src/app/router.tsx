import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import { AuthGuard } from "@/components/common/AuthGuard";
import { PlaceholderPage } from "@/components/common/PlaceholderPage";

// Lazy load pages for code splitting
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage/LoginPage"));
const DashboardHome = lazy(() => import("@/features/dashboard/pages/DashboardHome/DashboardHome"));
const SettingsPage = lazy(() => import("@/features/system/pages/SettingsPage/SettingsPage"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersPage/UsersPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const SubscriptionPage = lazy(() => import("@/features/subscription/pages/SubscriptionPage/SubscriptionPage"));
const CouponPage = lazy(() => import("@/features/coupon/pages/CouponPage/CouponPage"));
const GoalListPage = lazy(() => import("@/features/curriculum/goals/pages/GoalListPage/GoalListPage"));
const GoalEditorPage = lazy(() => import("@/features/curriculum/goals/pages/GoalEditorPage/GoalEditorPage"));
const LanguageListPage = lazy(() => import("@/features/curriculum/languages/pages/LanguageListPage/LanguageListPage"));
const LanguageEditorPage = lazy(() => import("@/features/curriculum/languages/pages/LanguageEditorPage/LanguageEditorPage"));
const SeriesListPage = lazy(() => import("@/features/curriculum/series/pages/SeriesListPage/SeriesListPage"));
const SeriesEditorPage = lazy(() => import("@/features/curriculum/series/pages/SeriesEditorPage/SeriesEditorPage"));
const CourseListPage = lazy(() => import("@/features/curriculum/courses/pages/CourseListPage/CourseListPage"));
const CourseStudioPage = lazy(() => import("@/features/curriculum/courses/pages/CourseStudioPage/CourseStudioPage"));

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
            {
                path: "curriculum/courses",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <CourseListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/courses/:courseId/studio",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <CourseStudioPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/languages",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <LanguageListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/languages/:code",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <LanguageEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/goals",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <GoalListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/goals/:slug",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <GoalEditorPage />
                    </Suspense>
                ),
            },
            { path: "questions", element: <PlaceholderPage title="Kho câu hỏi" /> },
            {
                path: "curriculum/series",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <SeriesListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/series/new",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <SeriesEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/series/:slug",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <SeriesEditorPage />
                    </Suspense>
                ),
            },
            { path: "curriculum/concepts", element: <PlaceholderPage title="Knowledge Graph" /> },
            { path: "curriculum/resources", element: <PlaceholderPage title="Tài nguyên mở rộng" /> },
            {
                path: "users",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <UsersPage />
                    </Suspense>
                ),
            },
            {
                path: "plans",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <SubscriptionPage />
                    </Suspense>
                ),
            },
            {
                path: "coupons",
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <CouponPage />
                    </Suspense>
                ),
            },
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
