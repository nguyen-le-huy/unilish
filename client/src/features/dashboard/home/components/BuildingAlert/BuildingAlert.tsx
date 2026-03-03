import styles from './BuildingAlert.module.css';
import thankYouImage from '@/assets/images/thankyou.png';


const BuildingAlert = () => {
    return (
        <div className={styles.container}>
            <img src={thankYouImage} alt="Thank you" className={styles.image} />
            <h2 className={styles.title}>Cảm ơn bạn đã ghé thăm UniLish</h2>
            <p className={styles.description}>Website hiện đang trong quá trình xây dựng. Mong bạn quay lại sau nhé!</p>
        </div>
    );
}

export default BuildingAlert;