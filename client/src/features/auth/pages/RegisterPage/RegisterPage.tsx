import styles from './RegisterPage.module.css';
import Right from '../../components/right/Right';
import RegisterForm from '../../components/form/RegisterForm';

const RegisterPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <RegisterForm />
            </div>
            <Right />
        </div>
    );
};

export default RegisterPage;
