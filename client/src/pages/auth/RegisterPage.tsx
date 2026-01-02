import UnilishLogo from "@/assets/Unilish.svg";
import { Link } from "react-router-dom";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import RegisterImage from "@/assets/register.webp"

export default function RegisterPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <Link to="/" className="flex items-center gap-2 font-medium w-fit h-fit">
                        <div className="flex items-center justify-center w-fit h-fit">
                            <img src={UnilishLogo} alt="Unilish" className="w-20 dark:brightness-0 dark:invert" />
                        </div>
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <RegisterForm />
                    </div>
                </div>
            </div>
            <div className="bg-muted relative hidden lg:block">
                <img
                    src={RegisterImage}
                    alt="Register Background"
                    className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4] dark:grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
                    <blockquote className="space-y-4">
                        <p className="text-2xl font-medium leading-normal">
                            &ldquo;Nhờ Unilish, tôi đã tự tin giao tiếp với đồng nghiệp quốc tế chỉ sau 3 tháng luyện tập đều đặn.&rdquo;
                        </p>
                        <footer className="text-base font-medium">
                            <div>Trần Thu Hà</div>
                            <div className="text-white/70 font-normal">Product Manager</div>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>
    );
}
