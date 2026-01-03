import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query'
import { ThemeSynchronizer } from "@/components/common/ThemeSynchronizer"
import { ClerkProvider } from '@clerk/clerk-react'
import { Toaster } from 'sonner'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key")
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            afterSignOutUrl="/"
            signInUrl="/login"
            signUpUrl="/register"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
        >
            <QueryClientProvider client={queryClient}>
                <ThemeSynchronizer />
                {children}
                <Toaster
                    position="top-center"
                    expand={false}
                    richColors
                    closeButton
                    visibleToasts={3}
                    gap={12}
                    toastOptions={{
                        className: 'font-sans',
                        style: {
                            padding: '16px',
                            borderRadius: '12px',
                        },
                        classNames: {
                            toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
                            description: 'group-[.toast]:text-muted-foreground',
                            actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                            cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                            success: 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200 dark:group-[.toaster]:bg-green-950 dark:group-[.toaster]:text-green-100 dark:group-[.toaster]:border-green-800',
                            error: 'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200 dark:group-[.toaster]:bg-red-950 dark:group-[.toaster]:text-red-100 dark:group-[.toaster]:border-red-800',
                            warning: 'group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-900 group-[.toaster]:border-amber-200 dark:group-[.toaster]:bg-amber-950 dark:group-[.toaster]:text-amber-100 dark:group-[.toaster]:border-amber-800',
                            info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200 dark:group-[.toaster]:bg-blue-950 dark:group-[.toaster]:text-blue-100 dark:group-[.toaster]:border-blue-800',
                        },
                    }}
                />
            </QueryClientProvider>
        </ClerkProvider>
    )
}
