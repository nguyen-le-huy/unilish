import { Button } from '@/components/core/Button';
import styles from './Intro.module.css';

interface Props {
  onStart: () => void;
}

const Intro = ({ onStart }: Props) => {
  return (
    <div className={styles.intro}>
        <div className={styles.manual}>
            <h1>Hướng dẫn chung</h1>
            <div className={styles.content}>
                <p className={styles.title}>Để việc làm bài diễn ra thuận lợi, bạn hãy chú ý những điểm quan trọng sau:</p>
                <ul className={styles.list}>
                    <li><span>Kiểm tra và đảm bảo Loa/Tai nghe và Microphone đã kết nối.</span> Bạn hãy Test microphone trước khi làm bài để đảm bảo bài làm của bạn được ghi nhận đầy đủ nhé!</li>
                    <li><span>Làm bài ở nơi yên tĩnh, ít tiếng ồn và âm thanh nhiễu.</span> 'Nói gần microphone để UniLish ghi âm được chất lượng tốt nhất. Chất lượng file ghi âm quá thấp, nhiều tạp âm sẽ ảnh hưởng rất nhiều đến việc chấm điểm bạn nha.</li>
                    <li>Lưu ý giới hạn thời gian trả lời!! Với kinh nghiệm đi thi rất nhiều lần của đội ngũ Học thuật tại UniLish, khi đi thi thật, Giám khảo sẽ ngắt phần trả lời và chuyển sang câu khác nếu bạn nói quá dài chứ không đợi bạn nói hết ý. Vì vậy bạn hãy tập làm quen với việc trả lời trong một khoảng thời gian cố định bạn nhé!</li>
                </ul>
            </div>
        </div>
        <Button type="button" onClick={onStart}>Bắt đầu làm bài</Button>
    </div>
  );
}

export default Intro;