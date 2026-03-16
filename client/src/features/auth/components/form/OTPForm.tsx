import styles from "./AuthForm.module.css";
import Logo from '@/assets/images/Unilish.svg';
import OTPInput from '@/features/auth/components/OTPInput/OTPInput';
import { Button } from '@/components/core/Button';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useVerifyOTP } from "@/features/auth/hooks/useVerifyOTP";
import { useState, useCallback } from "react";
import { Loading } from '@/components/common/Loading/Loading';
import type { FormEvent } from 'react';

const OTPForm = () => {
    const location = useLocation();
    const email = location.state?.email;
    const [otp, setOtp] = useState('');
    const { mutate: verify, isPending } = useVerifyOTP();

    if (!email) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    const handleSubmit = useCallback((e?: FormEvent) => {
        e?.preventDefault();
        if (isPending) {
            return;
        }

        if (otp.length === 4) {
            verify({ email, otp });
        }
    }, [otp, email, verify, isPending]);

    return (
        <div className={styles.content}>
            <img src={Logo} alt="Unilish" />
            <div className={styles.title}>
                <h3>Xác nhận email của bạn</h3>
                <p>Chúng tôi đã gửi mã xác thực tới {email}</p>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <OTPInput length={4} onComplete={setOtp} />
                <Button
                    type="submit"
                    size="full"
                    variant="primary"
                    padding="A"
                    disabled={isPending || otp.length < 4}
                >
                    {isPending ? <Loading variant="inline" size="sm" /> : 'Xác thực tài khoản'}
                </Button>
            </form>
            <p className={styles.resetPassword}>Chưa có tài khoản? <span><Link to={PATHS.AUTH.REGISTER}>Đăng ký ngay</Link></span></p>
        </div>
    );
};


export default OTPForm;