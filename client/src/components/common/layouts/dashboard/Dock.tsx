import { useNavigate } from 'react-router-dom';
import styles from './Dashboard-Layout.module.css';
import bookImage from '@/assets/images/dock/Books.png';
import faceTimeImage from '@/assets/images/dock/FaceTime.png';
import finalCutProImage from '@/assets/images/dock/Final-Cut-Pro.png';
import finderImage from '@/assets/images/dock/Finder.png';
import newsImage from '@/assets/images/dock/News.png';
import pagesImage from '@/assets/images/dock/Pages.png';
import photosImage from '@/assets/images/dock/Photos.png';
import scriptEditorImage from '@/assets/images/dock/Script-Editor.png';
import settingsImage from '@/assets/images/dock/Settings.png';
import shortcutsImage from '@/assets/images/dock/Shortcuts.png';
import siriImage from '@/assets/images/dock/Siri.png';

interface DockItem {
  src: string;
  alt: string;
  path?: string;
}

const dockItems: DockItem[] = [
  { src: finderImage, alt: 'Home', path: '/dashboard' },
  { src: faceTimeImage, alt: 'AI Speaking', path: '/dashboard/ai-voice' },
  { src: photosImage, alt: 'Photos' },
  { src: newsImage, alt: 'News' },
  { src: settingsImage, alt: 'Settings' },
  { src: finalCutProImage, alt: 'Final Cut Pro' },
  { src: pagesImage, alt: 'Pages' },
  { src: scriptEditorImage, alt: 'Script Editor' },
  { src: siriImage, alt: 'Siri' },
  { src: shortcutsImage, alt: 'Shortcuts' },
  { src: bookImage, alt: 'Books' },
];

const Dock = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.dock}>
      {dockItems.map((item) => (
        <div 
          key={item.alt} 
          className={styles.dockItem}
          onClick={() => item.path && navigate(item.path)}
          style={{ cursor: item.path ? 'pointer' : 'default' }}
        >
          <span className={styles.dockLabel}>{item.alt}</span>
          <img src={item.src} alt={item.alt} className={styles.dockImage} />
        </div>
      ))}
    </div>
  );
};

export default Dock;