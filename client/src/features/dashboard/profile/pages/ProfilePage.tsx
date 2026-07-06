import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getCurrentUser } from '@/features/auth/api/get-current-user';
import type { User } from '@/features/auth/types';
import { useAuthStore } from '@/stores/auth.store';
import { useLanguagesQuery } from '@/features/dashboard/language-selection/hooks/use-languages-query';
import { useLearningGoalsQuery } from '@/features/dashboard/goal-selection/hooks/use-learning-goals-query';
import { useDashboard } from '@/features/dashboard/learning/hooks/use-dashboard';
import { PATHS } from '@/config/paths';
import { Loading } from '@/components/common/Loading/Loading';
import { updateProfile, type UpdateProfilePayload } from '../api/update-profile';
import { uploadProfileAvatar } from '../api/upload-profile-avatar';
import styles from './ProfilePage.module.css';

const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
type Level = (typeof LEVELS)[number];

const SKILL_LABELS: Record<string, string> = {
    speaking: 'Nói',
    listening: 'Nghe',
    reading: 'Đọc',
    writing: 'Viết',
    grammar: 'Ngữ pháp',
    vocabulary: 'Từ vựng',
    pronunciation: 'Phát âm',
};

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return '0 phút';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} phút`;
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
};

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0]?.[0]}${parts[parts.length - 1]?.[0]}` : parts[0]?.slice(0, 2) || 'U').toUpperCase();
};

interface ProfileContentProps {
    user: User;
}

const ProfileContent = ({ user }: ProfileContentProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const setUser = useAuthStore((state) => state.setUser);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const { data: languages = [], isLoading: isLoadingLanguages } = useLanguagesQuery();
    const { data: goals = [], isLoading: isLoadingGoals } = useLearningGoalsQuery();
    const { data: dashboard, isLoading: isLoadingDashboard } = useDashboard();

    const initialForm = {
        fullName: user.fullName ?? '',
        phoneNumber: user.phoneNumber ?? '',
        dateOfBirth: user.dateOfBirth?.slice(0, 10) ?? '',
        gender: user.gender ?? 'prefer_not_to_say',
        languageId: user.learningLanguageId ?? '',
        goalId: user.learningGoalId ?? '',
        targetLevel: (LEVELS.includes(user.targetLevel as Level) ? user.targetLevel : 'B2') as Level,
    };

    const [form, setForm] = useState(initialForm);

    const syncUser = (updated: User) => {
        const selectedLanguage = languages.find((item) => item._id === form.languageId);
        const selectedGoal = goals.find((item) => item._id === form.goalId);
        const mergedUser: User = {
            ...user,
            ...updated,
            nativeLanguage: selectedLanguage?.code ?? user.nativeLanguage ?? null,
            learningGoal: selectedGoal?.slug ?? user.learningGoal ?? null,
        };
        queryClient.setQueryData(['auth', 'me'], mergedUser);
        setUser(mergedUser);
    };

    const updateMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (updated) => {
            syncUser(updated);
            void queryClient.invalidateQueries({ queryKey: ['learning', 'dashboard'] });
            toast.success('Đã cập nhật hồ sơ.');
        },
        onError: () => toast.error('Không thể cập nhật hồ sơ. Vui lòng thử lại.'),
    });

    const avatarMutation = useMutation({
        mutationFn: async (file: File) => {
            const uploaded = await uploadProfileAvatar(file);
            return updateProfile({ avatarUrl: uploaded.url });
        },
        onSuccess: (updated) => {
            syncUser(updated);
            toast.success('Đã cập nhật ảnh đại diện.');
        },
        onError: () => toast.error('Không thể tải ảnh đại diện.'),
    });

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn một tệp hình ảnh.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ảnh đại diện không được vượt quá 5MB.');
            return;
        }
        avatarMutation.mutate(file);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const selectedLanguage = languages.find((item) => item._id === form.languageId);
        const selectedGoal = goals.find((item) => item._id === form.goalId);
        const payload: UpdateProfilePayload = {
            fullName: form.fullName.trim(),
            phoneNumber: form.phoneNumber.trim() || null,
            dateOfBirth: form.dateOfBirth || null,
            gender: form.gender,
            targetLevel: form.targetLevel,
            learningGoal: selectedGoal?.slug ?? null,
        };
        if (selectedLanguage) payload.nativeLanguage = selectedLanguage.code;
        updateMutation.mutate(payload);
    };

    const activeCourse = dashboard?.activeCourse;
    const currentLanguage = languages.find((item) => item._id === form.languageId);
    const currentGoal = goals.find((item) => item._id === form.goalId);
    const weakSkills = user.weakSkills ?? [];
    const hasPlacementResult = typeof user.placementTestScore === 'number'
        && (user.placementTestScore > 0 || weakSkills.length > 0);

    return (
        <div className={styles.profilePage}>
            <section className={styles.profileHero}>
                <div className={styles.profileIdentity}>
                    <div className={styles.avatarWrap}>
                        {user.avatarUrl ? <img src={user.avatarUrl} alt={`Ảnh đại diện của ${user.fullName}`} /> : <span>{getInitials(user.fullName)}</span>}
                        <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarMutation.isPending} aria-label="Thay ảnh đại diện">
                            {avatarMutation.isPending ? '…' : '✎'}
                        </button>
                        <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    </div>
                    <div>
                        <span className={styles.eyebrow}>Hồ sơ học viên</span>
                        <h1>{user.fullName}</h1>
                        <div className={styles.identityMeta}>
                            <span>{user.email}</span>
                            {user.isVerified && <span className={styles.verifiedBadge}>✓ Đã xác minh</span>}
                        </div>
                    </div>
                </div>
                <div className={styles.levelOverview}>
                    <div><span>Trình độ hiện tại</span><strong>{user.currentLevel ?? 'A0'}</strong></div>
                    <i aria-hidden="true">→</i>
                    <div><span>Mục tiêu</span><strong>{form.targetLevel}</strong></div>
                </div>
            </section>

            <section className={styles.statsGrid} aria-label="Tổng quan học tập">
                <article><span>Thời gian học</span><strong>{isLoadingDashboard ? '—' : formatDuration(dashboard?.summary.timeSpentSeconds ?? 0)}</strong><small>Tổng thời gian hoạt động</small></article>
                <article><span>Bài học hoàn thành</span><strong>{isLoadingDashboard ? '—' : activeCourse?.completedLessons ?? 0}</strong><small>{activeCourse ? `trên ${activeCourse.totalLessons} bài` : 'Chưa có khóa học'}</small></article>
                <article><span>Khóa học hoàn thành</span><strong>{isLoadingDashboard ? '—' : dashboard?.summary.completedCourses ?? 0}</strong><small>{dashboard?.summary.activeCourses ?? 0} khóa đang học</small></article>
                <article><span>Điểm đầu vào</span><strong>{hasPlacementResult ? `${user.placementTestScore}/100` : 'Chưa có'}</strong><small>CEFR {user.currentLevel ?? 'A0'}</small></article>
            </section>

            <div className={styles.contentGrid}>
                <form className={styles.profileForm} onSubmit={handleSubmit}>
                    <header className={styles.sectionHeader}>
                        <div><span className={styles.sectionKicker}>Thông tin cá nhân</span><h2>Chỉnh sửa hồ sơ</h2><p>Cập nhật thông tin và định hướng học tập của bạn.</p></div>
                    </header>

                    <div className={styles.formGrid}>
                        <label className={styles.fullField}><span>Họ và tên</span><input value={form.fullName} minLength={2} maxLength={50} required onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
                        <label><span>Email</span><input value={user.email} disabled /><small>Email không thể thay đổi tại đây.</small></label>
                        <label><span>Số điện thoại</span><input type="tel" value={form.phoneNumber} maxLength={20} placeholder="Nhập số điện thoại" onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} /></label>
                        <label><span>Ngày sinh</span><input type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm((current) => ({ ...current, dateOfBirth: event.target.value }))} /></label>
                        <label><span>Giới tính</span><select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as typeof form.gender }))}><option value="prefer_not_to_say">Không muốn trả lời</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label>
                        <label><span>Ngôn ngữ đang học</span><select value={form.languageId} disabled={isLoadingLanguages} onChange={(event) => setForm((current) => ({ ...current, languageId: event.target.value }))}><option value="">Chọn ngôn ngữ</option>{languages.map((language) => <option key={language._id} value={language._id}>{language.flagIconUrl ? '◉ ' : ''}{language.name}</option>)}</select></label>
                        <label><span>Mục tiêu học tập</span><select value={form.goalId} disabled={isLoadingGoals} onChange={(event) => setForm((current) => ({ ...current, goalId: event.target.value }))}><option value="">Chọn mục tiêu</option>{goals.map((goal) => <option key={goal._id} value={goal._id}>{goal.title}</option>)}</select></label>
                        <label><span>Trình độ mục tiêu</span><select value={form.targetLevel} onChange={(event) => setForm((current) => ({ ...current, targetLevel: event.target.value as Level }))}>{LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
                    </div>

                    <div className={styles.formActions}>
                        <button type="button" className={styles.secondaryButton} onClick={() => setForm(initialForm)} disabled={updateMutation.isPending}>Đặt lại</button>
                        <button type="submit" className={styles.primaryButton} disabled={updateMutation.isPending || form.fullName.trim().length < 2}>{updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                    </div>
                </form>

                <aside className={styles.sideColumn}>
                    <section className={styles.learningCard}>
                        <header><span className={styles.sectionKicker}>Hồ sơ học tập</span><h2>Định hướng của bạn</h2></header>
                        <dl>
                            <div><dt>Ngôn ngữ</dt><dd>{currentLanguage?.name ?? 'Chưa chọn'}</dd></div>
                            <div><dt>Mục tiêu</dt><dd>{currentGoal?.title ?? 'Chưa chọn'}</dd></div>
                            <div><dt>Trình độ</dt><dd>{user.currentLevel ?? 'A0'} → {form.targetLevel}</dd></div>
                        </dl>
                        <div className={styles.weakSkills}>
                            <span>Kỹ năng cần cải thiện</span>
                            <div>{weakSkills.length > 0 ? weakSkills.map((skill) => <em key={skill}>{SKILL_LABELS[skill] ?? skill}</em>) : <small>Chưa xác định — hãy làm bài kiểm tra trình độ.</small>}</div>
                        </div>
                        <button type="button" className={styles.outlineButton} onClick={() => navigate(PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING)}>{hasPlacementResult ? 'Làm lại kiểm tra trình độ' : 'Kiểm tra trình độ ngay'} <span>→</span></button>
                    </section>

                    <section className={styles.courseCard}>
                        <header><span className={styles.sectionKicker}>Khóa học gần nhất</span><h2>{activeCourse?.name ?? 'Chưa có khóa học'}</h2></header>
                        {activeCourse ? <><div className={styles.courseMeta}><span>{activeCourse.level}</span><span>{activeCourse.completedLessons}/{activeCourse.totalLessons} bài học</span></div><div className={styles.progressLabel}><span>Tiến độ</span><strong>{activeCourse.progressPercent}%</strong></div><div className={styles.progressTrack}><span style={{ width: `${activeCourse.progressPercent}%` }} /></div><button type="button" className={styles.courseButton} onClick={() => navigate(activeCourse.nextLessonId ? PATHS.LESSON_PLAYER(activeCourse.nextLessonId) : PATHS.COURSE_DETAIL(activeCourse.slug))}>{activeCourse.status === 'COMPLETED' ? 'Xem lại khóa học' : 'Tiếp tục học'} <span>→</span></button></> : <><p>Khám phá khóa học phù hợp với mục tiêu của bạn.</p><button type="button" className={styles.courseButton} onClick={() => navigate(PATHS.DASHBOARD.ALL_COURSES)}>Xem tất cả khóa học <span>→</span></button></>}
                    </section>
                </aside>
            </div>
        </div>
    );
};

const ProfilePage = () => {
    const profileQuery = useQuery({ queryKey: ['auth', 'me'], queryFn: getCurrentUser, staleTime: 60_000 });

    if (profileQuery.isLoading) return <div className={styles.statePage}><Loading variant="inline" size="md" /></div>;
    if (profileQuery.isError || !profileQuery.data) return <div className={styles.statePage}><h1>Không thể tải hồ sơ</h1><p>Vui lòng tải lại trang và thử lại.</p><button type="button" onClick={() => void profileQuery.refetch()}>Thử lại</button></div>;

    return <ProfileContent key={profileQuery.data.updatedAt ?? profileQuery.data._id} user={profileQuery.data} />;
};

export default ProfilePage;
