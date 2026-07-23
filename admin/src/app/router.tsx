import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AdminLayout from "@/components/layouts/AdminLayout";
import { AuthGuard } from "@/components/common/AuthGuard";

// Lazy load pages for code splitting
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage/LoginPage"));
const DashboardHome = lazy(() => import("@/features/dashboard/pages/DashboardHome/DashboardHome"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersPage/UsersPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const GoalListPage = lazy(() => import("@/features/curriculum/goals/pages/GoalListPage/GoalListPage"));
const GoalEditorPage = lazy(() => import("@/features/curriculum/goals/pages/GoalEditorPage/GoalEditorPage"));
const LanguageListPage = lazy(() => import("@/features/curriculum/languages/pages/LanguageListPage/LanguageListPage"));
const LanguageEditorPage = lazy(() => import("@/features/curriculum/languages/pages/LanguageEditorPage/LanguageEditorPage"));
const CourseListPage = lazy(() => import("@/features/curriculum/courses/pages/CourseListPage/CourseListPage"));
const CourseStudioPage = lazy(() => import("@/features/curriculum/courses/pages/CourseStudioPage/CourseStudioPage"));

const QuestionBankPage = lazy(() => import("@/features/question-bank/pages/QuestionBankPage/QuestionBankPage"));
const QuestionEditorPage = lazy(() => import("@/features/question-bank/pages/QuestionEditorPage/QuestionEditorPage"));
const PlacementTestListPage = lazy(() => import("@/features/placement-test/pages/PlacementTestListPage/PlacementTestListPage"));
const PlacementTestWizardPage = lazy(() => import("@/features/placement-test/pages/PlacementTestWizardPage/PlacementTestWizardPage"));
const IeltsPracticeListPage = lazy(() => import("@/features/ielts-practice/pages/IeltsPracticeListPage"));
const IeltsPracticeEditorPage = lazy(() => import("@/features/ielts-practice/pages/IeltsPracticeEditorPage"));
const IeltsPracticeDetailPage = lazy(() => import("@/features/ielts-practice/pages/IeltsPracticeDetailPage"));
const AiVoiceContentPage = lazy(() => import("@/features/ai-voice-content/AiVoiceContentPage"));
const ShadowingManagementPage = lazy(() => import("@/features/shadowing/ShadowingManagementPage"));
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
            // ─── IELTS Practice ────────────────────────────────────
            {
                path: "ielts-practice",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <IeltsPracticeListPage />
                    </Suspense>
                ),
            },
            {
                path: "ielts-practice/new",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <IeltsPracticeEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "ielts-practice/:id",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <IeltsPracticeDetailPage />
                    </Suspense>
                ),
            },
            {
                path: "ielts-practice/:id/edit",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <IeltsPracticeEditorPage />
                    </Suspense>
                ),
            },
            {
                path: "ai-voice-content",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <AiVoiceContentPage />
                    </Suspense>
                ),
            },
            {
                path: "shadowing",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <ShadowingManagementPage />
                    </Suspense>
                ),
            },
            {
                path: "users",
                element: (
                    <Suspense fallback={pageLoaderFallback}>
                        <UsersPage />
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
