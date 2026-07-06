import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PATHS } from '@/config/paths';
import styles from './IeltsSkillPage.module.css';

type SkillSlug = 'listening' | 'reading' | 'writing' | 'speaking';

interface PracticeTest {
    id: string;
    title: string;
    questionLabel: string;
    attempts: number;
    duration: number;
}

const SKILL_CONTENT: Record<SkillSlug, { name: string; vietnamese: string; description: string; tests: PracticeTest[] }> = {
    listening: {
        name: 'Listening',
        vietnamese: 'Nghe',
        description: 'Luyện nghe theo cấu trúc đề thi thật với bốn phần và nhiều ngữ cảnh giao tiếp khác nhau.',
        tests: [
            ['cam-20-listening-1', 'Cam 20 Listening · Test 1', '10 câu hỏi', 472, 12],
            ['cam-20-listening-2', 'Cam 20 Listening · Test 2', '10 câu hỏi', 305, 12],
            ['cam-20-listening-3', 'Cam 20 Listening · Test 3', '10 câu hỏi', 211, 12],
            ['cam-20-listening-4', 'Cam 20 Listening · Test 4', '10 câu hỏi', 173, 12],
            ['cam-19-listening-1', 'Cam 19 Listening · Test 1', '10 câu hỏi', 890, 12],
            ['cam-19-listening-2', 'Cam 19 Listening · Test 2', '10 câu hỏi', 634, 12],
            ['cam-19-listening-3', 'Cam 19 Listening · Test 3', '10 câu hỏi', 428, 12],
            ['cam-19-listening-4', 'Cam 19 Listening · Test 4', '10 câu hỏi', 316, 12],
        ].map(([id, title, questionLabel, attempts, duration]) => ({ id, title, questionLabel, attempts, duration })) as PracticeTest[],
    },
    reading: {
        name: 'Reading',
        vietnamese: 'Đọc',
        description: 'Thực hành đọc hiểu học thuật, quản lý thời gian và làm quen đầy đủ các dạng câu hỏi IELTS.',
        tests: [
            ['cam-20-reading-1', 'Cam 20 Reading · Test 1', '40 câu hỏi', 1848, 60],
            ['cam-20-reading-2', 'Cam 20 Reading · Test 2', '40 câu hỏi', 1120, 60],
            ['cam-20-reading-3', 'Cam 20 Reading · Test 3', '40 câu hỏi', 752, 60],
            ['cam-20-reading-4', 'Cam 20 Reading · Test 4', '40 câu hỏi', 642, 60],
            ['cam-19-reading-1', 'Cam 19 Reading · Test 1', '40 câu hỏi', 1532, 60],
            ['cam-19-reading-2', 'Cam 19 Reading · Test 2', '40 câu hỏi', 988, 60],
            ['cam-19-reading-3', 'Cam 19 Reading · Test 3', '40 câu hỏi', 734, 60],
            ['cam-19-reading-4', 'Cam 19 Reading · Test 4', '40 câu hỏi', 519, 60],
        ].map(([id, title, questionLabel, attempts, duration]) => ({ id, title, questionLabel, attempts, duration })) as PracticeTest[],
    },
    writing: {
        name: 'Writing',
        vietnamese: 'Viết',
        description: 'Luyện Task 1 và Task 2 theo bộ đề Cambridge, có định hướng phân bổ thời gian sát kỳ thi.',
        tests: [
            ['cam-20-writing-1', 'Cam 20 Writing · Test 1', '1 bài viết', 328, 20],
            ['cam-20-writing-2', 'Cam 20 Writing · Test 2', '1 bài viết', 241, 20],
            ['cam-20-writing-3', 'Cam 20 Writing · Test 3', '1 bài viết', 196, 20],
            ['cam-20-writing-4', 'Cam 20 Writing · Test 4', '1 bài viết', 142, 20],
            ['cam-19-writing-1', 'Cam 19 Writing · Test 1', '1 bài viết', 459, 20],
            ['cam-19-writing-2', 'Cam 19 Writing · Test 2', '1 bài viết', 367, 20],
            ['cam-19-writing-3', 'Cam 19 Writing · Test 3', '1 bài viết', 284, 20],
            ['cam-19-writing-4', 'Cam 19 Writing · Test 4', '1 bài viết', 219, 20],
        ].map(([id, title, questionLabel, attempts, duration]) => ({ id, title, questionLabel, attempts, duration })) as PracticeTest[],
    },
    speaking: {
        name: 'Speaking',
        vietnamese: 'Nói',
        description: 'Luyện đủ ba phần thi nói với chủ đề thường gặp và nâng phản xạ cùng AI Speaking Coach.',
        tests: [
            ['speaking-people', 'Speaking Practice · People & Relationships', '3 phần thi', 764, 15],
            ['speaking-education', 'Speaking Practice · Education', '3 phần thi', 623, 15],
            ['speaking-technology', 'Speaking Practice · Technology', '3 phần thi', 582, 15],
            ['speaking-travel', 'Speaking Practice · Travel & Places', '3 phần thi', 491, 15],
            ['speaking-work', 'Speaking Practice · Work & Career', '3 phần thi', 438, 15],
            ['speaking-environment', 'Speaking Practice · Environment', '3 phần thi', 376, 15],
            ['speaking-culture', 'Speaking Practice · Culture & Media', '3 phần thi', 312, 15],
            ['speaking-health', 'Speaking Practice · Health & Lifestyle', '3 phần thi', 269, 15],
        ].map(([id, title, questionLabel, attempts, duration]) => ({ id, title, questionLabel, attempts, duration })) as PracticeTest[],
    },
};

const isSkillSlug = (value: string | undefined): value is SkillSlug => Boolean(value && value in SKILL_CONTENT);

const MetaIcon = ({ type }: { type: 'document' | 'users' | 'clock' }) => {
    if (type === 'users') {
        return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-1.8a3.2 3.2 0 00-3.2-3.2H6.2A3.2 3.2 0 003 18.2V20M9.5 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM17 11a3 3 0 000-5.8M18 15.2a3.2 3.2 0 013 3V20" /></svg>;
    }
    if (type === 'clock') {
        return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></svg>;
    }
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" /></svg>;
};

const IeltsSkillPage = () => {
    const { skill } = useParams();
    const navigate = useNavigate();

    if (!isSkillSlug(skill)) {
        return <Navigate to={PATHS.DASHBOARD.IELTS_PRACTICE} replace />;
    }

    const content = SKILL_CONTENT[skill];
    const handleOpenTest = (test: PracticeTest) => {
        if (skill === 'listening') {
            navigate(PATHS.DASHBOARD.IELTS_LISTENING_TEST(test.id));
            return;
        }

        if (skill === 'reading') {
            navigate(PATHS.DASHBOARD.IELTS_READING_TEST(test.id));
            return;
        }

        if (skill === 'writing') {
            navigate(PATHS.DASHBOARD.IELTS_WRITING_TEST(test.id));
            return;
        }

        if (skill === 'speaking') {
            navigate(PATHS.DASHBOARD.AI_VOICE);
            return;
        }

        toast.info(`${test.title} đang được hoàn thiện nội dung. Bạn sẽ sớm có thể bắt đầu làm đề.`);
    };

    return (
        <main className={styles.page}>
            <nav className={styles.breadcrumb} aria-label="Điều hướng IELTS">
                <Link to={PATHS.DASHBOARD.IELTS_PRACTICE}>Luyện đề IELTS</Link>
                <span aria-hidden="true">/</span>
                <span>{content.name}</span>
            </nav>

            <header className={styles.hero}>
                <div>
                    <span className={styles.eyebrow}>IELTS {content.name}</span>
                    <h1>Luyện kỹ năng {content.name} <small>{content.vietnamese}</small></h1>
                    <p>{content.description}</p>
                </div>
                <div className={styles.summary}>
                    <strong>{content.tests.length}</strong>
                    <span>đề luyện tập</span>
                </div>
            </header>

            <section className={styles.testSection}>
                <div className={styles.sectionHeader}>
                    <div>
                        <span className={styles.sectionKicker}>Thư viện luyện tập</span>
                        <h2>Danh sách đề</h2>
                    </div>
                    <p>Chọn một đề để xem nội dung và bắt đầu luyện tập.</p>
                </div>

                <div className={styles.testGrid}>
                    {content.tests.map((test, index) => (
                        <article className={styles.testCard} key={test.id}>
                            <div className={styles.testInfo}>
                                <div className={styles.titleRow}>
                                    <span className={styles.testNumber}>{String(index + 1).padStart(2, '0')}</span>
                                    <h3>{test.title}</h3>
                                    <span className={styles.freeBadge}>Miễn phí</span>
                                </div>
                                <div className={styles.testMeta}>
                                    <span><MetaIcon type="document" />{test.questionLabel}</span>
                                    <span><MetaIcon type="users" />{test.attempts.toLocaleString('vi-VN')}</span>
                                    <span><MetaIcon type="clock" />{test.duration} phút</span>
                                </div>
                            </div>
                            <button type="button" onClick={() => handleOpenTest(test)}>
                                Xem chi tiết <span aria-hidden="true">→</span>
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
};

export default IeltsSkillPage;
