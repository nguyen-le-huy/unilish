import styles from "./Right.module.css";

const Right = () => {
    return (
        <div className={styles.container}>
            <div className={styles.right}>
                <div className={styles.feedback}>
                    <p className={styles.content}>Tôi từng rất ngại giao tiếp, nhưng nhờ AI Speaking Coach của Unilish, tôi đã tự tin nói tiếng Anh chỉ sau 2 tuần. Phản xạ nhanh hơn, phát âm chuẩn hơn và không còn sợ sai nữa. Một trải nghiệm học tập tuyệt vời!</p>
                    <div className={styles.author}>
                        <p className={styles.name}>Minh Anh</p>
                        <p className={styles.jobAndLocation}>Học viên | Hà Nội, Việt Nam</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Right;
