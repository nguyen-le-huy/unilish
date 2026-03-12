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
                        <p className={styles.footerHeading}>Về chúng tôi</p>
                        <a href="#" className={styles.footerLink}>UniLish cho doanh nghiệp</a>
                        <a href="#" className={styles.footerLink}>Tuyển dụng</a>
                        <a href="#" className={styles.footerLink}>Câu hỏi thường gặp</a>
                        <a href="#" className={styles.footerLink}>Liên hệ</a>
                        <a href="#" className={styles.footerLink}>Blog</a>
                        <a href="#" className={styles.footerLink}>Liên hệ báo chí</a>
                        <a href="#" className={styles.footerLink}>Instagram</a>
                    </div>

                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>Chính sách</p>
                        <a href="#" className={styles.footerLink}>Quyền riêng tư</a>
                        <a href="#" className={styles.footerLink}>Điều khoản</a>
                    </div>

                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>Ngôn ngữ</p>
                        <a href="#" className={styles.footerLink}>한국어</a>
                        <a href="#" className={styles.footerLink}>日本語</a>
                        <a href="#" className={styles.footerLink}>Español</a>
                        <a href="#" className={styles.footerLink}>繁體中文</a>
                        <a href="#" className={styles.footerLink}>简体中文</a>
                        <a href="#" className={styles.footerLink}>Português</a>
                        <a href="#" className={styles.footerLink}>Français</a>
                        <a href="#" className={styles.footerLink}>Deutsch</a>
                        <a href="#" className={styles.footerLink}>Tiếng Việt</a>
                    </div>

                    <div className={styles.footerColumn}>
                        <p className={styles.footerHeading}>Tải ứng dụng</p>
                        <a href="#" className={styles.footerLink}>iOS</a>
                        <a href="#" className={styles.footerLink}>Android</a>
                        <a href="#" className={styles.footerLink}>Tặng UniLish</a>
                    </div>
                </div>

                <p className={styles.footerCopy}>© 2026 HYSTUDIO, INC. BẢO LƯU MỌI QUYỀN</p>
            </div>
        </footer>
    );
};

export default Footer;