import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import RootLayout from '@/components/layouts/RootLayout';
import MarketingLayout from '@/components/layouts/MarketingLayout';
import { AuthGuard } from '@/features/auth/components/AuthGuard';

// Lazy load pages for code splitting
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'));
const HomePage = lazy(() => import('@/pages/marketing/home/HomePage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OTPPage = lazy(() => import('@/pages/auth/OTPPage'));
const ProfilePage = lazy(() => import('@/pages/dashboard/ProfilePage'));
const SubscriptionPage = lazy(() => import('@/pages/dashboard/SubscriptionPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Loading fallback component
const PageLoader = () => (
    <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
);

export const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <MarketingLayout />,
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <HomePage />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: '/app',
                element: (
                    <AuthGuard>
                        <DashboardLayout />
                    </AuthGuard>
                ),
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <DashboardHome />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: '/dashboard',
                element: (
                    <AuthGuard>
                        <DashboardLayout />
                    </AuthGuard>
                ),
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <DashboardHome />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'profile',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <ProfilePage />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'subscription',
                        element: (
                            <Suspense fallback={<PageLoader />}>
                                <SubscriptionPage />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: '/login',
                element: (
                    <>
                        <SignedIn>
                            <Navigate to="/dashboard" replace />
                        </SignedIn>
                        <SignedOut>
                            <Suspense fallback={<PageLoader />}>
                                <LoginPage />
                            </Suspense>
                        </SignedOut>
                    </>
                ),
            },
            {
                path: '/register',
                element: (
                    <>
                        <SignedIn>
                            <Navigate to="/dashboard" replace />
                        </SignedIn>
                        <SignedOut>
                            <Suspense fallback={<PageLoader />}>
                                <RegisterPage />
                            </Suspense>
                        </SignedOut>
                    </>
                ),
            },
            {
                path: '/verify-otp',
                element: (
                    <>
                        <SignedIn>
                            <Navigate to="/dashboard" replace />
                        </SignedIn>
                        <SignedOut>
                            <Suspense fallback={<PageLoader />}>
                                <OTPPage />
                            </Suspense>
                        </SignedOut>
                    </>
                ),
            },
            {
                path: '/sso-callback',
                element: <AuthenticateWithRedirectCallback />,
            },
            {
                path: '*',
                element: (
                    <Suspense fallback={<PageLoader />}>
                        <NotFoundPage />
                    </Suspense>
                ),
            },
        ],
    },
]);

