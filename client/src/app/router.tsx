import { createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import MarketingLayout from '@/components/layouts/MarketingLayout';
import DashboardHome from '@/pages/dashboard/DashboardHome';
import HomePage from '@/pages/marketing/home/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

export const router = createBrowserRouter([
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
        element: <DashboardLayout />,
        children: [
            {
                index: true,
                element: <DashboardHome />,
            },
        ],
    },
    {
        path: '/dashboard',
        element: <DashboardLayout />,
        children: [
            {
                index: true,
                element: <DashboardHome />,
            },
        ],
    },
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
]);
