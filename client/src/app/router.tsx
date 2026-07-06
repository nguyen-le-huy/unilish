import { createBrowserRouter } from 'react-router-dom';
import React, { Suspense } from 'react';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import DashboardLayout from '@/components/common/layouts/dashboard/DashboardLayout';

// Lazy load pages
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage/LoginPage'));
const RegisterPage = React.lazy(() => import('@/features/auth/pages/RegisterPage/RegisterPage'));
const DashboardHomePage = React.lazy(() => import('@/features/dashboard/home/pages/home-page'));
const GoalSelectionPage = React.lazy(() => import('@/features/dashboard/goal-selection'));
const LanguageSelectionPage = React.lazy(() => import('@/features/dashboard/language-selection'));
const LevelSelectionPage = React.lazy(() => import('@/features/dashboard/level-selection'));
const MarketingHomePage = React.lazy(() => import('@/features/marketing/pages/home-page/home-page'));
const OTPPage = React.lazy(() => import('@/features/auth/pages/OTPVerifyPage/OTPVerifyPage'));
const ListeningReadingPage = React.lazy(() => import('@/features/dashboard/placement-test'));
const AuthSuccessPage = React.lazy(() => import('@/features/auth/pages/AuthSuccessPage/AuthSuccessPage'));
const RecommendCoursePage = React.lazy(() => import('@/features/dashboard/recommend-course/pages/RecommendCourse'));
const AllCoursesPage = React.lazy(() => import('@/features/dashboard/all-courses/pages/AllCoursesPage'));
const NotFoundPage = React.lazy(() => import('@/features/dashboard/not-found/not-found-page'));
const AIVoicePage = React.lazy(() => import('@/features/dashboard/ai-voice/pages/AIVoice'));
const ShadowingPage = React.lazy(() => import('@/features/dashboard/shadowing/pages/ShadowingPage/ShadowingPage'));
const ShadowingPlayerPage = React.lazy(() => import('@/features/dashboard/shadowing/pages/ShadowingPlayerPage/ShadowingPlayerPage'));
const DictationPage = React.lazy(() => import('@/features/dashboard/shadowing/pages/DictationPage/DictationPage'));
const CourseOverviewPage = React.lazy(() => import('@/features/dashboard/learning/pages/CourseOverviewPage/CourseOverviewPage'));
const LessonPlayerPage = React.lazy(() => import('@/features/dashboard/learning/pages/LessonPlayerPage/LessonPlayerPage'));
const ProfilePage = React.lazy(() => import('@/features/dashboard/profile'));
const IeltsPracticePage = React.lazy(() => import('@/features/dashboard/ielts-practice'));
const IeltsSkillPage = React.lazy(() => import('@/features/dashboard/ielts-practice/pages/IeltsSkillPage'));
const IeltsListeningTestPage = React.lazy(() => import('@/features/dashboard/ielts-practice/pages/IeltsListeningTestPage'));
const IeltsReadingTestPage = React.lazy(() => import('@/features/dashboard/ielts-practice/pages/IeltsReadingTestPage'));
const IeltsWritingTestPage = React.lazy(() => import('@/features/dashboard/ielts-practice/pages/IeltsWritingTestPage'));

export const router = createBrowserRouter([
    {
        path: PATHS.HOME,
        element: (
            <Suspense fallback={<Loading />}>
                <MarketingHomePage />
            </Suspense>
        ),
    },
    {
        path: PATHS.MARKETING.HOME,
        element: (
            <Suspense fallback={<Loading />}>
                <MarketingHomePage />
            </Suspense>
        ),
    },
    {
        path: PATHS.AUTH.LOGIN,
        element: (
            <Suspense fallback={<Loading />}>
                <LoginPage />
            </Suspense>
        ),
    },
    {
        path: PATHS.AUTH.REGISTER,
        element: (
            <Suspense fallback={<Loading />}>
                <RegisterPage />
            </Suspense>
        ),
    },
    {
        path: PATHS.AUTH.OTP,
        element: (
            <Suspense fallback={<Loading />}>
                <OTPPage />
            </Suspense>
        ),
    },
    {
        path: PATHS.AUTH.SUCCESS,
        element: (
            <Suspense fallback={<Loading />}>
                <AuthSuccessPage />
            </Suspense>
        ),
    },
    {
        path: PATHS.DASHBOARD.ROOT,
        element: <ProtectedRoute />,
        children: [
            {
                element: <DashboardLayout />,
                children: [
                    {
                        path: 'placement-test/lr',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <ListeningReadingPage />
                            </Suspense>
                        ),
                    },
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <DashboardHomePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'goal-selection',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <GoalSelectionPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'language-selection',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <LanguageSelectionPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'level-selection',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <LevelSelectionPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: PATHS.DASHBOARD.RECOMMEND_COURSE.replace('/dashboard/', ''),
                        element: (
                            <Suspense fallback={<Loading />}>
                                <RecommendCoursePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: PATHS.DASHBOARD.ALL_COURSES.replace('/dashboard/', ''),
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AllCoursesPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'course/:slug',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <CourseOverviewPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'learning/lessons/:lessonId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <LessonPlayerPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'ai-voice',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AIVoicePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'shadowing',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <ShadowingPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'shadowing/:videoId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <ShadowingPlayerPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'dictation/:videoId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <DictationPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: PATHS.DASHBOARD.PROFILE.replace('/dashboard/', ''),
                        element: (
                            <Suspense fallback={<Loading />}>
                                <ProfilePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: PATHS.DASHBOARD.IELTS_PRACTICE.replace('/dashboard/', ''),
                        element: (
                            <Suspense fallback={<Loading />}>
                                <IeltsPracticePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: `${PATHS.DASHBOARD.IELTS_PRACTICE.replace('/dashboard/', '')}/:skill`,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <IeltsSkillPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'ielts-practice/listening/:testId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <IeltsListeningTestPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'ielts-practice/reading/:testId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <IeltsReadingTestPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'ielts-practice/writing/:testId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <IeltsWritingTestPage />
                            </Suspense>
                        ),
                    },
                    {
                        path: '*',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <NotFoundPage />
                            </Suspense>
                        ),
                    },
                ],
            },
        ],
    },

    {
        path: '*',
        element: (
            <Suspense fallback={<Loading />}>
                <NotFoundPage />
            </Suspense>
        ),
    },
]);
