import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';

interface ProvidersProps {
    children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster position="top-center" richColors duration={1500} />
        </QueryClientProvider>
    );
};
