import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ThemeSynchronizer } from '@/components/common/ThemeSynchronizer';
import { queryClient } from '@/lib/react-query';

export function Providers({ children }: { children: ReactNode }) {

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeSynchronizer />
            {children}
            <Toaster
                position="top-center"
                richColors
                closeButton
            />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

