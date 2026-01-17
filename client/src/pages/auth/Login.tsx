import styles from './Auth.module.css';
import Right from '@/features/auth/components/right/Right';
import LoginForm from '@/features/auth/components/form/LoginForm';

const Login = () => {
    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <LoginForm />
            </div>
            <Right />
        </div>
    );
};

export default Login;
