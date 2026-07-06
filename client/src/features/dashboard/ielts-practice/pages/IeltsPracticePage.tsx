import { Link } from 'react-router-dom';
import { PATHS } from '@/config/paths';
import styles from './IeltsPracticePage.module.css';

const SKILLS = [
    { name: 'Listening', slug: 'listening', label: 'Nghe', icon: '◖', description: 'Luyện nghe hội thoại và bài nói học thuật theo cấu trúc IELTS.', status: '8 đề luyện tập' },
    { name: 'Reading', slug: 'reading', label: 'Đọc', icon: '▤', description: 'Đọc hiểu, xác định thông tin và làm quen các dạng câu hỏi phổ biến.', status: '8 đề luyện tập' },
    { name: 'Writing', slug: 'writing', label: 'Viết', icon: '✎', description: 'Luyện Task 1 và Task 2 với hướng dẫn triển khai ý rõ ràng.', status: '8 đề luyện tập' },
    { name: 'Speaking', slug: 'speaking', label: 'Nói', icon: '◉', description: 'Tăng phản xạ giao tiếp cùng AI Coach theo chủ đề IELTS Speaking.', status: '8 đề luyện tập' },
] as const;

const IeltsPracticePage = () => {
    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroCopy}>
                    <span className={styles.eyebrow}>IELTS Practice Hub</span>
                    <h1>Luyện đề IELTS theo từng kỹ năng</h1>
                    <p>Xây dựng chiến lược làm bài, luyện tập có trọng tâm và theo dõi tiến bộ trong một không gian học tập thống nhất.</p>
                    <div className={styles.heroMeta}>
                        <span><i>4</i> kỹ năng</span>
                        <span><i>AI</i> hỗ trợ luyện nói</span>
                        <span><i>∞</i> luyện tập theo tốc độ của bạn</span>
                    </div>
                </div>
                <div className={styles.bandCard} aria-label="Mục tiêu IELTS">
                    <span>Mục tiêu của bạn</span>
                    <strong>IELTS</strong>
                    <p>Chọn kỹ năng để bắt đầu hành trình luyện thi.</p>
                </div>
            </section>

            <section className={styles.skillsSection}>
                <header className={styles.sectionHeader}>
                    <div><span className={styles.sectionKicker}>Chọn nội dung</span><h2>Bốn kỹ năng IELTS</h2></div>
                    <p>Chọn kỹ năng bạn muốn cải thiện và bắt đầu với bộ đề phù hợp.</p>
                </header>

                <div className={styles.skillGrid}>
                    {SKILLS.map((skill, index) => (
                            <Link
                                key={skill.name}
                                className={`${styles.skillCard} ${styles.availableCard}`}
                                to={PATHS.DASHBOARD.IELTS_SKILL(skill.slug)}
                            >
                                <div className={styles.cardTop}>
                                    <span className={styles.skillIcon} aria-hidden="true">{skill.icon}</span>
                                    <span className={styles.readyBadge}>{skill.status}</span>
                                </div>
                                <span className={styles.skillNumber}>0{index + 1}</span>
                                <h3>{skill.name} <small>{skill.label}</small></h3>
                                <p>{skill.description}</p>
                                <span className={styles.cardCta}>
                                    Xem danh sách đề <span aria-hidden="true">→</span>
                                </span>
                            </Link>
                    ))}
                </div>
            </section>
        </main>
    );
};

export default IeltsPracticePage;
