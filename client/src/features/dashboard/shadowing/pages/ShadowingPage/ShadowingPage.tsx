import styles from './ShadowingPage.module.css';
import VideoInput from '../../components/VideoInput/VideoInput';
import VideoLibrary from '../../components/VideoLibrary/VideoLibrary';

const ShadowingPage = () => {
  return (
    <div className={styles.container}>
      <VideoInput />
      <VideoLibrary />
    </div>
  );
};

export default ShadowingPage;
