import { useSignUp } from "@clerk/clerk-react"
import { notify } from "@/lib/notification"

export const useGoogleSignUp = () => {
    const { signUp, isLoaded } = useSignUp()

    const signUpWithGoogle = async () => {
        if (!isLoaded) return
        try {
            await signUp.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: "/sso-callback",
                redirectUrlComplete: "/dashboard",
            })
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to sign up with Google";
            notify.auth.registerError(message)
        }
    }

    return { signUpWithGoogle, isLoaded }
}
