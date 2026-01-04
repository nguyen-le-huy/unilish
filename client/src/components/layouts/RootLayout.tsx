import { Outlet, ScrollRestoration } from 'react-router-dom';

/**
 * Root Layout
 * Wraps the entire application to provide global functionality like ScrollRestoration.
 * This ensures that when navigating between pages, the scroll position is reset or restored correctly.
 */
export default function RootLayout() {
    return (
        <>
            <ScrollRestoration />
            <Outlet />
        </>
    );
}
