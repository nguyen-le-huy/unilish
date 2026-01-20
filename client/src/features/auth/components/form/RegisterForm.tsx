import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Logo from '@/assets/images/Unilish.svg';
import styles from "./AuthForm.module.css";
import { Button } from '@/components/common/button';
import { Loading } from '@/components/common/loading/Loading';
import { useRegister } from '../../hooks/useRegister';
import { RegisterPayload, RegisterSchema } from '../../types';
import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import GoogleLogo from '@/assets/images/auth/google.svg';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import { useCallback } from 'react';

const RegisterForm = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterPayload>({
        resolver: zodResolver(RegisterSchema),
    });

    const { mutate: doRegister, isPending: isRegisterPending } = useRegister();
    const { signInWithGoogle, isSyncing } = useGoogleAuth();

    const onSubmit = useCallback((data: RegisterPayload) => {
        doRegister(data);
    }, [doRegister]);

    const isPending = isRegisterPending || isSyncing;

    return (
        <div className={styles.content}>
            <img src={Logo} alt="Unilish" />
            <div className={styles.title}>
                <h3>Tạo tài khoản mới</h3>
                <p>Tham gia Unilish để cải thiện kỹ năng tiếng Anh của bạn.</p>
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
                    <label htmlFor="fullName">Họ và tên</label>
                    <input
                        type="text"
                        id="fullName"
                        placeholder='Nhập họ và tên của bạn'
                        {...register('fullName')}
                        disabled={isPending}
                    />
                    {errors.fullName && <span className={styles.error}>{errors.fullName.message}</span>}
                </div>

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
                </div>
                <Button
                    type="submit"
                    variant="primary"
                    size="full"
                    disabled={isPending}
                >
                    {isRegisterPending ? <Loading variant="inline" size="sm" /> : 'Đăng ký'}
                </Button>
            </form>
            <p className={styles.signUp}>Đã có tài khoản? <span><Link to={PATHS.AUTH.LOGIN}>Đăng nhập</Link></span></p>
        </div>
    );
};

export default RegisterForm;
