import styles from './ShadowingPage.module.css';
import VideoInput from '../../components/VideoInput/VideoInput';
import VideoLibrary from '../../components/VideoLibrary/VideoLibrary';

const ShadowingPage = () => {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Luyện phản xạ giao tiếp</span>
          <h1>Nghe chuẩn. Nói theo. Tiến bộ từng câu.</h1>
          <p>
            Luyện nói đuổi với video thực tế, ghi âm giọng nói và nhận phản hồi
            phát âm ngay trong mỗi lượt luyện.
          </p>
          <div className={styles.featureList} aria-label="Tính năng luyện nói đuổi">
            <span><b>01</b> Nghe theo từng câu</span>
            <span><b>02</b> Ghi âm giọng nói</span>
            <span><b>03</b> Chấm điểm phát âm</span>
          </div>
        </div>

        <aside className={styles.practiceCard} aria-label="Quy trình luyện nói đuổi">
          <div className={styles.practiceCardTop}>
            <span>Quy trình luyện tập</span>
            <span className={styles.liveBadge}>AI feedback</span>
          </div>
          <div className={styles.soundWave} aria-hidden="true">
            {[18, 34, 52, 28, 68, 42, 76, 48, 60, 30, 46, 22].map((height, index) => (
              <i key={index} style={{ height }} />
            ))}
          </div>
          <div className={styles.practiceSteps}>
            <span>Nghe mẫu</span>
            <i aria-hidden="true">→</i>
            <span>Nói theo</span>
            <i aria-hidden="true">→</i>
            <span>Nhận điểm</span>
          </div>
        </aside>
      </section>
      <VideoInput />
      <VideoLibrary />
    </div>
  );
};

export default ShadowingPage;
