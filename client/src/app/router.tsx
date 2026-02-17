import { createBrowserRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { ProtectedRoute } from '@/app/ProtectedRoute';

// Lazy load pages
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage/LoginPage'));
const RegisterPage = React.lazy(() => import('@/features/auth/pages/RegisterPage/RegisterPage'));
const HomePage = React.lazy(() => import('@/pages/dashboard/home/Home'));
const OTPPage = React.lazy(() => import('@/features/auth/pages/OTPVerifyPage/OTPVerifyPage'));
const AuthSuccessPage = React.lazy(() => import('@/features/auth/pages/AuthSuccessPage/AuthSuccessPage'));

export const router = createBrowserRouter([
    {
        path: PATHS.HOME,
        element: <Navigate to={PATHS.DASHBOARD.HOME} replace />,
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
                index: true,
                element: (
                    <Suspense fallback={<Loading />}>
                        <HomePage />
                    </Suspense>
                ),
            },
        ],
    },
    {
        path: '*',
        element: <div>404 Not Found (This page is being built...)</div>,
    },
]);
