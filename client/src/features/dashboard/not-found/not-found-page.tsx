import depressedImage from '@/assets/images/depressed.svg';
import styles from './not-found-page.module.css';

const NotFoundPage = () => {
    return (
        <section className={styles.container}>
            <img src={depressedImage} alt="404 Not Found" className={styles.image} />
            <h1 className={styles.title}>404 NOT FOUND</h1>
            <p className={styles.description}>Trang này đang được xây dựng hoặc không tồn tại</p>
        </section>
    );
};

export default NotFoundPage;