"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useNavigate, useSearchParams } from "react-router-dom"

import { notify } from "@/lib/notification"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { verifyOTP } from "../api/auth-api"

const FormSchema = z.object({
    pin: z.string().min(6, {
        message: "Mã OTP phải có 6 ký tự.",
    }),
})

export function OTPForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            pin: "",
        },
    })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        if (!email) {
            notify.auth.loginError("Không tìm thấy email. Vui lòng đăng ký lại.");
            return;
        }

        try {
            const response = await verifyOTP({ email, otp: data.pin as string }); // Force string type

            // Store auth data manually (duplicate logic from storeAuthData to avoid circular dept or complex refactor)
            localStorage.setItem('unilish_user', JSON.stringify(response.data.user));
            localStorage.setItem('unilish_token', response.data.token);

            notify.auth.loginSuccess(); // Re-use login success toast
            navigate("/dashboard");
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            const message = axiosError.response?.data?.message || "Xác thực thất bại";
            notify.auth.loginError(message);
            form.setError("pin", { message: message });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 flex flex-col items-center">
                <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                            <FormLabel className="text-center">Mã xác thực (OTP)</FormLabel>
                            <FormControl>
                                <InputOTP maxLength={6} {...field}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </FormControl>
                            <FormDescription className="text-center">
                                Vui lòng nhập mã OTP gồm 6 chữ số đã được gửi tới <strong>{email}</strong>
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full max-w-xs">Xác nhận</Button>
            </form>
        </Form>
    )
}
