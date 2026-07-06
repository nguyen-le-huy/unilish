import styles from "./Right.module.css";

const Right = () => {
    return (
        <div className={styles.container}>
            <div className={styles.topBar}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span>Học tiếng Anh thông minh hơn cùng AI</span>
            </div>
            <div className={styles.right}>
                <div className={styles.feedback}>
                    <div className={styles.rating} aria-label="Đánh giá 5 trên 5 sao">★★★★★</div>
                    <blockquote className={styles.content}>“Tôi từng rất ngại giao tiếp. Sau hai tuần luyện tập cùng AI Speaking Coach, tôi phản xạ nhanh hơn, phát âm rõ hơn và tự tin nói tiếng Anh mỗi ngày.”</blockquote>
                    <div className={styles.author}>
                        <div className={styles.avatar} aria-hidden="true">MA</div>
                        <div>
                            <p className={styles.name}>Minh Anh</p>
                            <p className={styles.jobAndLocation}>Học viên Unilish · Hà Nội</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Right;
