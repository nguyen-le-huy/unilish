import { GalleryVerticalEnd } from "lucide-react"

import { OTPForm } from "@/features/auth/components/OTPForm"
import { Link } from "react-router-dom"

export default function OTPPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-xs flex-col gap-6">
                <Link to="/" className="flex items-center gap-2 self-center font-medium">
                    <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    Unilish Inc.
                </Link>

                <div className="flex flex-col gap-6">
                    <OTPForm />
                </div>
            </div>
        </div>
    )
}
