import styles from './LoginPage.module.css';
import Right from '../../components/right/Right';
import LoginForm from '../../components/form/LoginForm';

const LoginPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <LoginForm />
            </div>
            <Right />
        </div>
    );
};

export default LoginPage;
