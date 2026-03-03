import styles from './home-page.module.css';
import MarketingLayout from '@/components/common/layouts/marketing-layout/MarketingLayout';
import Hero from '@/features/marketing/components/hero/hero';
import Carousel from '@/features/marketing/components/carousel/carousel';
import Rating from '@/features/marketing/components/rating/rating';
import Introduction from '@/features/marketing/components/introduction/introduction';
import Feedback from '@/features/marketing/components/feedback/feedback';
import FAQ from '@/features/marketing/components/faq/faq';
import EndInvitation from '@/features/marketing/components/end-invitation/end-invitation';

const MarketingHomePage = () => {
  return (
    <MarketingLayout>
      <div className={styles.page}>
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