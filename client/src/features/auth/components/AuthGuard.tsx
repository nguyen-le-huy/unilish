import { useAuth } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom"; // Change import
import { getStoredToken } from "../hooks/useAuthSync";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn } = useAuth();
    const localToken = getStoredToken();

    if (!isLoaded) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Allow access if signed in via Clerk OR has local token (Traditional Auth)
    if (!isSignedIn && !localToken) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
