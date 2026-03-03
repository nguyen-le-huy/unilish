import styles from './Marketing-Layout.module.css';
import unilishLogo from '@/assets/images/Unilish.svg';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerInner}>
                <div className={styles.footerBrand}>
                    <img src={unilishLogo} alt="Unilish" className={styles.footerLogo} />
                </div>

                <div className={styles.footerLinks}>
                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>About us</p>
                        <a href="#" className={styles.footerLink}>Speak For Business</a>
                        <a href="#" className={styles.footerLink}>Careers</a>
                        <a href="#" className={styles.footerLink}>FAQ</a>
                        <a href="#" className={styles.footerLink}>Contact</a>
                        <a href="#" className={styles.footerLink}>Blog</a>
                        <a href="#" className={styles.footerLink}>Press Inquiries</a>
                        <a href="#" className={styles.footerLink}>Instagram</a>
                    </div>

                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>Policy</p>
                        <a href="#" className={styles.footerLink}>Privacy</a>
                        <a href="#" className={styles.footerLink}>Terms</a>
                    </div>

                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>Languages</p>
                        <a href="#" className={styles.footerLink}>한국어</a>
                        <a href="#" className={styles.footerLink}>日本語</a>
                        <a href="#" className={styles.footerLink}>Español</a>
                        <a href="#" className={styles.footerLink}>繁體中文</a>
                        <a href="#" className={styles.footerLink}>简体中文</a>
                        <a href="#" className={styles.footerLink}>Português</a>
                        <a href="#" className={styles.footerLink}>Français</a>
                        <a href="#" className={styles.footerLink}>Deutsch</a>
                        <a href="#" className={styles.footerLink}>English</a>
                    </div>

                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>Download</p>
                        <a href="#" className={styles.footerLink}>iOS</a>
                        <a href="#" className={styles.footerLink}>Android</a>
                        <a href="#" className={styles.footerLink}>Gift Speak</a>
                    </div>
                </div>

                <p className={styles.footerCopy}>© 2026 HYSTUDIO, INC. ALL RIGHTS RESERVED</p>
            </div>
        </footer>
    );
};

export default Footer;