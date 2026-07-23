import styles from './ShadowingPage.module.css';
import VideoLibrary from '../../components/VideoLibrary/VideoLibrary';

const ShadowingPage = () => {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Học tiếng Anh qua YouTube</span>
          <h1>Xem YouTube. Nghe chuẩn. Nói tự tin.</h1>
          <p>
            Học từ những video YouTube được tuyển chọn, luyện nghe theo từng câu,
            ghi âm giọng nói và nhận phản hồi phát âm ngay trong mỗi lượt luyện.
          </p>
          <div className={styles.featureList} aria-label="Tính năng học với YouTube">
            <span><b>01</b> Xem YouTube theo từng câu</span>
            <span><b>02</b> Ghi âm giọng nói</span>
            <span><b>03</b> Chấm điểm phát âm</span>
          </div>
        </div>

        <aside className={styles.practiceCard} aria-label="Quy trình học với YouTube">
          <div className={styles.practiceCardTop}>
            <span>Quy trình học với YouTube</span>
            <span className={styles.liveBadge}>AI feedback</span>
          </div>
          <div className={styles.soundWave} aria-hidden="true">
            {[18, 34, 52, 28, 68, 42, 76, 48, 60, 30, 46, 22].map((height, index) => (
              <i key={index} style={{ height }} />
            ))}
          </div>
          <div className={styles.practiceSteps}>
            <span>Xem &amp; nghe</span>
            <i aria-hidden="true">→</i>
            <span>Nói theo</span>
            <i aria-hidden="true">→</i>
            <span>Nhận điểm</span>
          </div>
        </aside>
      </section>
      <VideoLibrary />
    </div>
  );
};

export default ShadowingPage;
