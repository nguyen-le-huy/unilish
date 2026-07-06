import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import GoogleLogo from '@/assets/images/auth/google.svg';
import Logo from '@/assets/images/Unilish.svg';
import styles from "./AuthForm.module.css";
import { Button } from '@/components/core/Button';
import { Loading } from '@/components/common/Loading/Loading';
import { env } from '@/config/env';
import { useLogin } from '../../hooks/useLogin';

import { LoginPayload, LoginSchema } from '../../types';
import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import { toast } from 'sonner';

const LoginForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
        resolver: zodResolver(LoginSchema),
    });

    const { mutate: login, isPending: isLoginPending } = useLogin();

    const onSubmit = useCallback((data: LoginPayload) => {
        login(data);
    }, [login]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const errorCode = searchParams.get('error');

        if (errorCode === 'cancelled') {
            toast.error('Đăng nhập Google đã bị hủy');
        } else if (errorCode === 'oauth_failed') {
            toast.error('Đăng nhập Google thất bại. Vui lòng thử lại.');
        }

        if (!errorCode) {
            return;
        }

        searchParams.delete('error');
        const nextQuery = searchParams.toString();
        const nextUrl = nextQuery
            ? `${window.location.pathname}?${nextQuery}`
            : window.location.pathname;

        window.history.replaceState(null, '', nextUrl);
    }, []);

    const signInWithGoogle = () => {
        const clientUrl = encodeURIComponent(window.location.origin);
        window.location.href = `${env.API_URL}/auth/google?clientUrl=${clientUrl}`;
    };

    return (
        <div className={styles.content}>
            <Link to={PATHS.HOME} className={styles.logoLink} aria-label="Về trang chủ Unilish">
                <img className={styles.logo} src={Logo} alt="Unilish" />
            </Link>
            <div className={styles.title}>
                <span className={styles.eyebrow}>Chào mừng bạn trở lại</span>
                <h1>Đăng nhập vào Unilish</h1>
                <p>Tiếp tục hành trình chinh phục tiếng Anh của bạn.</p>
            </div>
            <Button
                variant="ghost"
                size="full"
                padding="A"
                leftIcon={GoogleLogo}

                onClick={signInWithGoogle}
                disabled={isLoginPending}
            >
                Tiếp tục với Google
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
                        autoComplete="email"
                        placeholder='Nhập email của bạn'
                        {...register('email')}
                        disabled={isLoginPending}
                        aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && <span className={styles.error}>{errors.email.message}</span>}
                </div>
                <div className={styles.inputGroup}>
                    <label htmlFor="password">Mật khẩu</label>
                    <div className={styles.passwordField}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="current-password"
                            placeholder='Nhập mật khẩu của bạn'
                            {...register('password')}
                            disabled={isLoginPending}
                            aria-invalid={Boolean(errors.password)}
                        />
                        <button
                            className={styles.passwordToggle}
                            type="button"
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                            {showPassword ? (
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.5 10.5 0 0112 4c5.4 0 9 6 9 6a16 16 0 01-2.3 3.1M6.2 6.2C4.2 7.6 3 10 3 10s3.6 6 9 6c1 0 1.9-.2 2.8-.5" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.6-6 9-6 9 6 9 6-3.6 6-9 6-9-6-9-6z" /><circle cx="12" cy="12" r="2.5" /></svg>
                            )}
                        </button>
                    </div>
                    {errors.password && <span className={styles.error}>{errors.password.message}</span>}
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    size="full"
                    padding="A"
                    disabled={isLoginPending}
                >
                    {isLoginPending ? <Loading variant="inline" size="sm" /> : 'Đăng nhập'}
                </Button>
            </form>
            <p className={styles.authSwitch}>Chưa có tài khoản? <Link to={PATHS.AUTH.REGISTER}>Đăng ký miễn phí</Link></p>
        </div>
    );
};

export default LoginForm;
