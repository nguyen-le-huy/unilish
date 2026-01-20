import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import GoogleLogo from '@/assets/images/auth/google.svg';
import Logo from '@/assets/images/Unilish.svg';
import styles from "./AuthForm.module.css";
import { Button } from '@/components/common/button';
import { Loading } from '@/components/common/loading/Loading';
import { useLogin } from '../../hooks/useLogin';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { LoginPayload, LoginSchema } from '../../types';
import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { useCallback } from 'react';

const LoginForm = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
        resolver: zodResolver(LoginSchema),
    });

    const { mutate: login, isPending: isLoginPending } = useLogin();
    const { signInWithGoogle, isSyncing } = useGoogleAuth();

    const onSubmit = useCallback((data: LoginPayload) => {
        login(data);
    }, [login]);

    const isPending = isLoginPending || isSyncing;

    return (
        <div className={styles.content}>
            <img src={Logo} alt="Unilish" />
            <div className={styles.title}>
                <h3>Đăng nhập vào tài khoản</h3>
                <p>Hành trình chinh phục tiếng Anh đang chờ bạn.</p>
            </div>
            <Button
                variant="ghost"
                size="full"
                leftIcon={GoogleLogo}
                onClick={signInWithGoogle}
                disabled={isPending}
            >
                {isSyncing ? <Loading variant="inline" size="sm" /> : 'Tiếp tục với Google'}
            </Button>
            <div className={styles.or}>
                <div className={styles.line}></div>
                <p>hoặc</p>
                <div className={styles.line}></div>
            </div>
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                <div className={styles.inputGroup}>
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        placeholder='Nhập email của bạn'
                        {...register('email')}
                        disabled={isPending}
                    />
                    {errors.email && <span className={styles.error}>{errors.email.message}</span>}
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="password">Mật khẩu</label>
                    <input
                        type="password"
                        id="password"
                        placeholder='Nhập mật khẩu của bạn'
                        {...register('password')}
                        disabled={isPending}
                    />
                    {errors.password && <span className={styles.error}>{errors.password.message}</span>}
                    <p className={styles.forgotPassword}>Quên mật khẩu?</p>
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    size="full"
                    disabled={isPending}
                >
                    {isLoginPending ? <Loading variant="inline" size="sm" /> : 'Đăng nhập'}
                </Button>
                <p className={styles.resetPassword}>Không thể đăng nhập? <span>Đặt lại mật khẩu</span></p>
            </form>
            <p className={styles.signUp}>Chưa có tài khoản? <span><Link to={PATHS.AUTH.REGISTER}>Đăng ký ngay</Link></span></p>
        </div>
    );
};

export default LoginForm;