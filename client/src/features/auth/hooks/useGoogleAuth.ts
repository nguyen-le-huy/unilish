import { useSignIn } from "@clerk/clerk-react"
import { notify } from "@/lib/notification"

export const useGoogleAuth = () => {
    const { signIn, isLoaded: isSignInLoaded } = useSignIn()
    // We can add useSignUp here if we want a unified hook, or keep them separate.
    // Since the logic is identical for redirect, we can reuse or just keep separate hooks for clarity.

    const loginWithGoogle = async () => {
        if (!isSignInLoaded) return
        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/dashboard",
            })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to sign in with Google";
            notify.auth.loginError(message)
        }
    }

    return { loginWithGoogle, isLoaded: isSignInLoaded }
}
