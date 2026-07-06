import styles from './writing-prompt-panel.module.css';

interface WritingPromptPanelProps {
    promptText: string;
    promptImageSrc: string;
}

export const WritingPromptPanel = ({ promptText, promptImageSrc }: WritingPromptPanelProps) => {
    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <div>
                    <span className={styles.eyebrow}>Đề bài</span>
                    <h2>Phân tích và trình bày dữ liệu</h2>
                </div>
                <span className={styles.languageBadge}>EN</span>
            </header>

            <div className={styles.promptBox}>
                <span className={styles.promptIcon} aria-hidden="true">A</span>
                <p>{promptText}</p>
            </div>

            <figure className={styles.figure}>
                <img src={promptImageSrc} alt="Biểu đồ dữ liệu của đề Writing" className={styles.imageQuestion} />
                <figcaption>Quan sát kỹ biểu đồ trước khi bắt đầu viết.</figcaption>
            </figure>
        </section>
    );
};
