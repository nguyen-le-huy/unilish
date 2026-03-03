import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import styles from './Marketing-Layout.module.css';

interface Props {
    children: ReactNode;
}

const MarketingLayout = ({ children }: Props) => {
    return (
        <div className={styles.layout}>
            <Header />
            <main className={styles.main}>{children}</main>
            <Footer />
        </div>
    );
};

export default MarketingLayout;