import styles from './Auth.module.css';
import Right from '@/features/auth/components/right/Right';
import OTPForm from '@/features/auth/components/form/OTPForm';


const OTP = () => {
    return (
        <div className={styles.container}>
            <div className={styles.left}>
                <OTPForm />
            </div>
            <Right />
        </div>
    );
};

export default OTP;
