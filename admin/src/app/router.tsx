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

const QuestionBankPage = lazy(() => import("@/features/question-bank/pages/QuestionBankPage/QuestionBankPage"));
const QuestionEditorPage = lazy(() => import("@/features/question-bank/pages/QuestionEditorPage/QuestionEditorPage"));
const PlacementTestListPage = lazy(() => import("@/features/placement-test/pages/PlacementTestListPage/PlacementTestListPage"));
const PlacementTestWizardPage = lazy(() => import("@/features/placement-test/pages/PlacementTestWizardPage/PlacementTestWizardPage"));
const ExamTestListPage = lazy(() => import("@/features/exam-tests/pages/ExamTestListPage/ExamTestListPage"));
const ExamTestWizardPage = lazy(() => import("@/features/exam-tests/pages/ExamTestWizardPage/ExamTestWizardPage"));
const ToeicTestWizardPage = lazy(() => import("@/features/exam-tests/pages/ToeicTestWizardPage/ToeicTestWizardPage"));
const pageLoaderFallback = (
    <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
);

export const router = createBrowserRouter([
    // Public Routes
    {
        path: "/auth/login",
        element: (
            <Suspense fallback={pageLoaderFallback}>
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
                    <Suspense fallback={pageLoaderFallback}>
                        <DashboardHome />
                    </Suspense>
                ),
            },
            // Placeholder routes
            {
                path: "curriculum/courses",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <CourseListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/courses/:courseId/studio",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <CourseStudioPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/languages",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <LanguageListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/languages/:code",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <LanguageEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/goals",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <GoalListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/goals/:slug",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <GoalEditorPage />
                    </Suspense>
                ),
            },
            { path: "questions", element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <QuestionBankPage />
                    </Suspense>
                ),
            },
            {
                path: "questions/new",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <QuestionEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "questions/:id/edit",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <QuestionEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "placement-tests",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <PlacementTestListPage />
                    </Suspense>
                ),
            },
            {
                path: "placement-tests/create",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <PlacementTestWizardPage />
                    </Suspense>
                ),
            },
            {
                path: "placement-tests/:id/edit",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <PlacementTestWizardPage />
                    </Suspense>
                ),
            },
            {
                path: "exam-tests",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <ExamTestListPage />
                    </Suspense>
                ),
            },
            {
                path: "exam-tests/create",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <ExamTestWizardPage />
                    </Suspense>
                ),
            },
            {
                path: "exam-tests/create/toeic",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <ToeicTestWizardPage />
                    </Suspense>
                ),
            },
            {
                path: "exam-tests/:id/edit",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <ExamTestWizardPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/series",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <SeriesListPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/series/new",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <SeriesEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "curriculum/series/:slug",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <SeriesEditorPage />
                    </Suspense>
                ),
            },
            { path: "curriculum/concepts", element: <PlaceholderPage title="Knowledge Graph" /> },
            { path: "curriculum/resources", element: <PlaceholderPage title="Tài nguyên mở rộng" /> },
            {
                path: "users",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <UsersPage />
                    </Suspense>
                ),
            },
            {
                path: "plans",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <SubscriptionPage />
                    </Suspense>
                ),
            },
            {
                path: "coupons",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
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
                    <Suspense fallback={pageLoaderFallback}>
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
            <Suspense fallback={pageLoaderFallback}>
                <NotFoundPage />
            </Suspense>
        ),
    },
]);
