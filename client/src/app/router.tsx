import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import RootLayout from '@/components/layouts/RootLayout';
import MarketingLayout from '@/components/layouts/MarketingLayout';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import HomePage from '@/pages/marketing/home/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import OTPPage from '@/pages/auth/OTPPage';
import ProfilePage from '@/pages/dashboard/ProfilePage';
import NotFoundPage from '@/pages/NotFoundPage';
import { AuthGuard } from '@/features/auth/components/AuthGuard';

export const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [

            // ... (existing routes can be kept, but I will target specific insertion point for route)

            {
                path: '/',
                element: <MarketingLayout />,
                children: [
                    {
                        index: true,
                        element: <HomePage />,
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
                        element: <DashboardHome />,
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
                        element: <DashboardHome />,
                    },
                    {
                        path: 'profile',
                        element: <ProfilePage />,
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
                            <LoginPage />
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
                            <RegisterPage />
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
                            <OTPPage />
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
                element: <NotFoundPage />,
            },
        ],
    },
]);
