import styles from './Auth.module.css';
import Right from '@/features/auth/components/right/Right';
import RegisterForm from '@/features/auth/components/form/RegisterForm';

const Register = () => {
    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <RegisterForm />
            </div>
            <Right />
        </div>
    );
};

export default Register;
