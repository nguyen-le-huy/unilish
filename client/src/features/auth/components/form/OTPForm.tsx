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

    const handleSubmit = useCallback((e?: FormEvent) => {
        e?.preventDefault();
        if (isPending || !email) {
            return;
        }

        if (otp.length === 4) {
            verify({ email, otp });
        }
    }, [otp, email, verify, isPending]);

    if (!email) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    return (
        <div className={styles.content}>
            <Link to={PATHS.HOME} className={styles.logoLink} aria-label="Về trang chủ Unilish">
                <img className={styles.logo} src={Logo} alt="Unilish" />
            </Link>
            <div className={styles.title}>
                <span className={styles.eyebrow}>Chỉ còn một bước</span>
                <h1>Xác nhận email của bạn</h1>
                <p>Nhập mã gồm 4 chữ số đã được gửi tới <strong>{email}</strong></p>
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
            <p className={styles.authSwitch}>Sai địa chỉ email? <Link to={PATHS.AUTH.REGISTER}>Đăng ký lại</Link></p>
        </div>
    );
};


export default OTPForm;
