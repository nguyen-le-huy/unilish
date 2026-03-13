import { createBrowserRouter } from 'react-router-dom';
import React, { Suspense } from 'react';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import DashboardLayout from '@/components/common/layouts/dashboard/DashboardLayout';

// Lazy load pages
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage/LoginPage'));
const RegisterPage = React.lazy(() => import('@/features/auth/pages/RegisterPage/RegisterPage'));
const DashboardHomePage = React.lazy(() => import('@/features/dashboard/home/pages/home-page/home-page'));
const GoalSelectionPage = React.lazy(() => import('@/features/dashboard/goal-selection/pages/goal-selection-page'));
const LevelSelectionPage = React.lazy(() => import('@/features/dashboard/level-selection/pages/level-selection-page'));
const MarketingHomePage = React.lazy(() => import('@/features/marketing/pages/home-page/home-page'));
const OTPPage = React.lazy(() => import('@/features/auth/pages/OTPVerifyPage/OTPVerifyPage'));
const ListeningReadingPage = React.lazy(() => import('@/features/dashboard/placement-test/pages/ListeningReading/ListeningReading'));
const AuthSuccessPage = React.lazy(() => import('@/features/auth/pages/AuthSuccessPage/AuthSuccessPage'));

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
                        path: 'level-selection',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <LevelSelectionPage />
                            </Suspense>
                        ),
                    },
                ],
            },
        ],
    },
    {
        path: '*',
        element: <div>404 Not Found (This page is being built...)</div>,
    },
]);
