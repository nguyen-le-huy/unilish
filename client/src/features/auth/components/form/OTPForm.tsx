import styles from "./AuthForm.module.css";
import Logo from '@/assets/images/Unilish.svg';
import OTPInput from '@/features/auth/components/OTPInput/OTPInput';
import { Button } from '@/components/common/button';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useVerifyOTP } from "../../hooks/useVerifyOTP";
import { useState, useCallback } from "react";
import { Loading } from '@/components/common/loading/Loading';

const OTPForm = () => {
    const location = useLocation();
    const email = location.state?.email;
    const [otp, setOtp] = useState('');
    const { mutate: verify, isPending } = useVerifyOTP();

    if (!email) {
        return <Navigate to={PATHS.AUTH.LOGIN} replace />;
    }

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        // Since otp is in dependency array, this will recreate
        // But we need current otp value.
        // In this specific case, cleaner is to pass otp to verify directly
        // But the check `if (otp.length === 4)` needs otp.
        if (otp.length === 4) {
            verify({ email, otp });
        }
    }, [otp, email, verify]);

    return (
        <div className={styles.content}>
            <img src={Logo} alt="Unilish" />
            <div className={styles.title}>
                <h3>Confirm your email</h3>
                <p>We sent a code to {email}</p>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <OTPInput length={4} onComplete={setOtp} />
                <Button
                    onClick={() => handleSubmit()}
                    type="submit"
                    size="full"
                    variant="primary"
                    disabled={isPending || otp.length < 4}
                >
                    {isPending ? <Loading variant="inline" size="sm" /> : 'Confirm Account'}
                </Button>
            </form>
            <p className={styles.resetPassword}>Don't have an account? <span><Link to={PATHS.AUTH.REGISTER}>Sign up</Link></span></p>
        </div>
    );
};


export default OTPForm;