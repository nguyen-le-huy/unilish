import styles from "./Speaking.module.css";
import Close from "@/assets/icons/close.svg";
import Mic from "@/assets/icons/mic.svg";
import Intro from "../../components/speaking/intro/Intro";
import { Button } from "@/components/core/Button";

const partList = [
    { label: "Part 1", questions: [1, 2, 3, 4] },
    { label: "Part 2", questions: [1, 2] },
    { label: "Part 3", questions: [1, 2] },
];

const Speaking = () => {
    return (
        <div className={styles.speaking}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <div></div>
                    <h2>Speaking Test</h2>
                    <img src={Close} alt="close" className={styles.closeIcon}/>
                </div>
                <div className={styles.body}>
                    {/* Speaking test content goes here */}
                    <Intro />
                </div>
                <div className={styles.buttonList}>
                    <Button
                        variant="outline"
                        borderColor="var(--green)"
                        textColor="var(--green)"
                        icon={Mic}
                        iconPosition="right"
                    >
                        Intro
                    </Button>

                    {partList.map((part) => (
                        <Button
                            key={part.label}
                            type="button"
                            borderColor="var(--dark-grey)"
                            textColor="var(--dark-grey)"
                            backgroundColor="transparent"
                            className={styles.partButton}
                        >
                            <span className={styles.partTitle}>{part.label}</span>

                            <span className={styles.partQuestionList}>
                                {part.questions.map((questionNumber) => (
                                    <span key={questionNumber} className={styles.partQuestionNumber}>
                                        {questionNumber}
                                    </span>
                                ))}
                            </span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Speaking;