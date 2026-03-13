import styles from './BuildingAlert.module.css';
import thankYouImage from '@/assets/images/thankyou.png';
import { Button } from '@/components/core/Button';
import { useAuthStore } from '@/stores/auth.store';



const BuildingAlert = () => {
    const logout = useAuthStore((state) => state.logout);

    return (
        <div className={styles.container}>
            <img src={thankYouImage} alt="Thank you" className={styles.image} />
            <h2 className={styles.title}>Cảm ơn bạn đã ghé thăm UniLish</h2>
            <p className={styles.description}>Website hiện đang trong quá trình xây dựng. Mong bạn quay lại sau nhé!</p>
            <Button variant="outline" onClick={logout}>Đăng xuất</Button>
        </div>
    );
}

export default BuildingAlert;