import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ClerkProvider } from '@clerk/clerk-react';
import { env } from '@/config/env';

interface ProvidersProps {
    children: ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
    if (!env.CLERK_PUBLISHABLE_KEY) {
        throw new Error("Missing Publishable Key")
    }

    return (
        <ClerkProvider publishableKey={env.CLERK_PUBLISHABLE_KEY}>
            <QueryClientProvider client={queryClient}>
                {children}
                <Toaster position="top-center" richColors />
            </QueryClientProvider>
        </ClerkProvider>
    );
};
