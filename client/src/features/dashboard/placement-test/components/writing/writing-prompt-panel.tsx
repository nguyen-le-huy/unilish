import styles from './writing-prompt-panel.module.css';

interface WritingPromptPanelProps {
    promptText: string;
    promptImageSrc: string;
}

export const WritingPromptPanel = ({ promptText, promptImageSrc }: WritingPromptPanelProps) => {
    return (
        <section className={styles.panel}>
            <h2 className={styles.title}>{promptText}</h2>
            <img src={promptImageSrc} alt="Writing question" className={styles.imageQuestion} />
        </section>
    );
};
