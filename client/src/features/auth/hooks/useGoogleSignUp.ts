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
        } catch (err: any) {
            console.error("Error signing up with Google:", err)
            notify.auth.registerError(err.message || "Failed to sign up with Google")
        }
    }

    return { signUpWithGoogle, isLoaded }
}
