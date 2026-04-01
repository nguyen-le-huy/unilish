import { useState } from 'react';
import styles from './Writting.module.css';
import imageQues from '@/assets/images/writtingques.png';
import { Button } from '@/components/core/Button';
import { SubmissionSuccessCard } from '@/components/core/SubmissionSuccessCard';

const Writting = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);

    return (
        <>
            <div className={styles.writting}>
                <div className={styles.left}>
                    <div className={styles.title}>
                        <p>The charts below show the use of water for agricultural products in Australia in 2004 and the value of these products to the Australian economy in the same year. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.</p>
                    </div>
                    <img src={imageQues} alt="Writting Question" className={styles.imageQues} />
                </div>
                <div className={styles.right}>
                    <div className={styles.header}>
                        <p>Khu vực viết bài</p>
                        <p className={styles.wordCount}>Word count: 0</p>
                    </div>
                    <div className={styles.writtingArea}>
                        <textarea className={styles.textArea} placeholder='Nhập phần viết của bạn ở đây.' />
                    </div>
                    <div className={styles.footer}>
                        <div className={styles.time}>
                            <p>Thời gian còn lại:</p>
                            <p>15:00</p>
                        </div>
                        <Button variant="primary" onClick={() => setIsSubmitted(true)}>Nộp bài</Button>
                    </div>
                </div>
            </div>

            {isSubmitted && (
                <div className={styles.overlay} role="dialog" aria-modal="true">
                    <SubmissionSuccessCard
                        description={"Bạn đã nộp thành công phần Writing.\nVui lòng chuẩn bị cho các phần tiếp theo."}
                        stats={[
                            { label: 'Thời gian hoàn thành', value: '15p' },
                            { label: 'Số từ đã nộp', value: '200' },
                        ]}
                        continueLabel="Tiếp tục phần Speaking"
                        onContinue={() => setIsSubmitted(false)}
                    />
                </div>
            )}
        </>
    );
}

export default Writting;