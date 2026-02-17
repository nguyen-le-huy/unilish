import styles from './OTPVerifyPage.module.css';
import Right from '../../components/right/Right';
import OTPForm from '../../components/form/OTPForm';

const OTPVerifyPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <OTPForm />
            </div>
            <Right />
        </div>
    );
};

export default OTPVerifyPage;
