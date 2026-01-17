import styles from "./Right.module.css";

const Right = () => {
    return (
        <div className={styles.container}>
            <div className={styles.right}>
                <div className={styles.feedback}>
                    <p className={styles.content}>I booked two high-paying shoots in my first week—more than I’d made in the previous month. I’m genuinely blown away and now have too much work!</p>
                    <div className={styles.author}>
                        <p className={styles.name}>Sienna Hart</p>
                        <p className={styles.jobAndLocation}>Photographer | Lisbon, Portugal</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Right;
