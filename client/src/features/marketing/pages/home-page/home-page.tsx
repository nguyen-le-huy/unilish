import { useEffect, useState } from 'react';
import styles from './home-page.module.css';
import MarketingLayout from '@/components/common/layouts/marketing-layout/MarketingLayout';
import Hero from '@/features/marketing/components/hero/hero';
import Carousel from '@/features/marketing/components/carousel/carousel';
import Rating from '@/features/marketing/components/rating/rating';
import Introduction from '@/features/marketing/components/introduction/introduction';
import Feedback from '@/features/marketing/components/feedback/feedback';
import FAQ from '@/features/marketing/components/faq/faq';
import EndInvitation from '@/features/marketing/components/end-invitation/end-invitation';
import { Loading } from '@/components/common/Loading/Loading';

const MarketingHomePage = () => {
  const [isPageReady, setIsPageReady] = useState<boolean>(document.readyState === 'complete');

  useEffect(() => {
    if (document.readyState === 'complete') {
      const completeTimer = window.setTimeout(() => {
        setIsPageReady(true);
      }, 350);

      return () => {
        window.clearTimeout(completeTimer);
      };
    }

    const handleWindowLoad = () => {
      window.setTimeout(() => {
        setIsPageReady(true);
      }, 350);
    };

    window.addEventListener('load', handleWindowLoad, { once: true });

    return () => {
      window.removeEventListener('load', handleWindowLoad);
    };
  }, []);

  return (
    <MarketingLayout>
      {!isPageReady && (
        <div className={styles.pageLoadingOverlay} role="status" aria-live="polite" aria-label="Trang đang tải tài nguyên">
          <div className={styles.loadingContent}>
            <Loading variant="inline" size="lg" className={styles.loadingSpinner} />
            <p className={styles.loadingText}>Đang tải trải nghiệm học tập...</p>
          </div>
        </div>
      )}
      <div className={`${styles.page} ${!isPageReady ? styles.pageHidden : styles.pageVisible}`}>
        <Hero />
        <div className={styles.fullBleed}>
          <Carousel />
        </div>
        <Rating />
        <Introduction />
        <Feedback />
        <FAQ />
        <EndInvitation />
      </div>
    </MarketingLayout>
  );
};

export default MarketingHomePage;