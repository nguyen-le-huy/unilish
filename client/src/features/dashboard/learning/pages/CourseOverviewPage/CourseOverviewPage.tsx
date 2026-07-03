import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/core/Button';
import { PATHS } from '@/config/paths';
import { useCourseRoadmap } from '../../hooks/use-course-roadmap';
import type { LearningStatus, LessonType } from '../../types/learning.types';
import styles from './CourseOverviewPage.module.css';

// ─── Lesson type labels and icons ─────────────────────────────────────────────

const LESSON_TYPE_META: Record<LessonType, { label: string; icon: string }> = {
    VOCAB:    { label: 'Từ vựng',    icon: '📝' },
    GRAMMAR:  { label: 'Ngữ pháp',   icon: '📖' },
    READING:  { label: 'Đọc hiểu',   icon: '📄' },
    LISTENING:{ label: 'Nghe',       icon: '🎧' },
    SPEAKING: { label: 'Nói',        icon: '🎤' },
    WRITING:  { label: 'Viết',       icon: '✏️' },
    UNIT_TEST:{ label: 'Kiểm tra',   icon: '📋' },
};

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<LearningStatus, string> = {
    LOCKED:      'Khóa',
    AVAILABLE:   'Sẵn sàng',
    IN_PROGRESS: 'Đang học',
    COMPLETED:   'Hoàn thành',
};

const STATUS_CLASS: Record<LearningStatus, string> = {
    LOCKED:      styles.statusLocked,
    AVAILABLE:   styles.statusAvailable,
    IN_PROGRESS: styles.statusInProgress,
    COMPLETED:   styles.statusCompleted,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatUnitProgress = (percent: number): string => `${percent}%`;

// ─── Component ────────────────────────────────────────────────────────────────

const CourseOverviewPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { data, isLoading, isError, refetch } = useCourseRoadmap(slug);
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

    const toggleUnit = useCallback((unitId: string) => {
        setExpandedUnits((prev) => {
            const next = new Set(prev);
            if (next.has(unitId)) {
                next.delete(unitId);
            } else {
                next.add(unitId);
            }
            return next;
        });
    }, []);

    const handleLessonAction = useCallback(
        (lessonId: string, status: LearningStatus) => {
            if (status === 'COMPLETED') {
                navigate(PATHS.LESSON_PLAYER(lessonId));
            } else {
                navigate(PATHS.LESSON_PLAYER(lessonId));
            }
        },
        [navigate],
    );

    // ── Loading ──
    if (isLoading) {
        return (
            <div className={styles.page}>
                <div className={styles.skeletonCover} />
                <div className={styles.skeletonBlock} />
                <div className={styles.skeletonBlock} />
            </div>
        );
    }

    // ── Error ──
    if (isError) {
        return (
            <div className={styles.page}>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Không thể tải khóa học</p>
                    <p className={styles.stateDescription}>
                        Có lỗi xảy ra. Vui lòng thử lại sau.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        padding="B"
                        fontSize={16}
                        textColor="black"
                        onClick={() => refetch()}
                    >
                        Thử lại
                    </Button>
                </div>
            </div>
        );
    }

    // ── Unavailable ──
    if (!data) {
        return (
            <div className={styles.page}>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Khóa học không khả dụng</p>
                    <p className={styles.stateDescription}>
                        Khóa học này hiện không mở.
                    </p>
                </div>
            </div>
        );
    }

    const { course, enrollment, progressPercent, nextLessonId, units } = data;
    const nextCta = nextLessonId
        ? PATHS.LESSON_PLAYER(nextLessonId)
        : PATHS.DASHBOARD.HOME;

    // ── Empty curriculum ──
    if (units.length === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.headerCard}>
                    <div className={styles.headerContent}>
                        {course.thumbnailUrl && (
                            <img
                                src={course.thumbnailUrl}
                                alt={course.name}
                                className={styles.headerThumb}
                            />
                        )}
                        <div className={styles.headerMeta}>
                            <span className={styles.heroEyebrow}>Tổng quan khóa học</span>
                            <h1 className={styles.title}>{course.name}</h1>
                            <div className={styles.courseBadges}>
                                <span>{course.language.name}</span>
                                <span>{course.level}</span>
                                <span>{course.learningGoal.title}</span>
                            </div>
                            {course.description && (
                                <p className={styles.description}>{course.description}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className={styles.stateContainer}>
                    <p className={styles.stateTitle}>Chưa có bài học</p>
                    <p className={styles.stateDescription}>
                        Khóa học này chưa có nội dung.
                    </p>
                </div>
            </div>
        );
    }

    // ── Full content ──
    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.headerCard}>
                <div className={styles.headerContent}>
                    {course.thumbnailUrl && (
                        <img
                            src={course.thumbnailUrl}
                            alt={course.name}
                            className={styles.headerThumb}
                        />
                    )}
                    <div className={styles.headerMeta}>
                        <span className={styles.heroEyebrow}>Tổng quan khóa học</span>
                        <h1 className={styles.title}>{course.name}</h1>
                        <div className={styles.courseBadges}>
                            <span>{course.language.name}</span>
                            <span>{course.level}</span>
                            <span>{course.learningGoal.title}</span>
                        </div>
                        {course.description && (
                            <p className={styles.description}>{course.description}</p>
                        )}
                        <div className={styles.progressHeading}>
                            <span>Tiến độ khóa học</span>
                            <strong>{progressPercent}%</strong>
                        </div>
                        <div className={styles.progressRow}>
                            <div className={styles.progressTrack}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                        {(enrollment.status === 'ACTIVE' || enrollment.status === 'COMPLETED') && (
                            <Button
                                type="button"
                                variant="outline"
                                padding="B"
                                fontSize={16}
                                textColor="black"
                                className={styles.ctaButton}
                                onClick={() => navigate(nextCta)}
                            >
                                {enrollment.status === 'COMPLETED' ? 'Xem lại khóa học' : progressPercent === 0 ? 'Bắt đầu học' : 'Tiếp tục học'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Roadmap */}
            <div className={styles.roadmap}>
                <div className={styles.roadmapHeading}>
                    <div>
                        <span className={styles.roadmapEyebrow}>Lộ trình học tập</span>
                        <h2>Nội dung khóa học</h2>
                    </div>
                    <span className={styles.unitCount}>{units.length} chương</span>
                </div>
                {units.map((unit) => {
                    const isExpanded = expandedUnits.has(unit.id) || unit.lessons.some((l) => l.status === 'IN_PROGRESS');
                    return (
                        <div key={unit.id} className={styles.unitCard}>
                            <button
                                type="button"
                                className={styles.unitHeader}
                                onClick={() => toggleUnit(unit.id)}
                                aria-expanded={isExpanded}
                            >
                                <div className={styles.unitTitleRow}>
                                    <span className={styles.unitTitle}>
                                        Chương {unit.orderIndex}: {unit.title}
                                    </span>
                                    <div className={styles.unitProgressArea}>
                                        <div className={styles.unitProgressTrack}>
                                            <span style={{ width: `${unit.progressPercent}%` }} />
                                        </div>
                                        <span className={`${styles.unitProgress} ${STATUS_CLASS[unit.status]}`}>
                                            {formatUnitProgress(unit.progressPercent)}
                                        </span>
                                    </div>
                                </div>
                                <span className={styles.unitLessonCount}>
                                    {unit.lessons.length} bài học
                                </span>
                                <svg
                                    className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                >
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>

                            {isExpanded && (
                                <div className={styles.lessonList}>
                                    {unit.lessons.map((lesson) => {
                                        const meta = LESSON_TYPE_META[lesson.type] ?? { label: lesson.type, icon: '📄' };
                                        const isCurrentLesson = lesson.id === nextLessonId;
                                        const isActionable = lesson.status !== 'LOCKED';

                                        return (
                                            <div
                                                key={lesson.id}
                                                className={`${styles.lessonRow} ${isCurrentLesson ? styles.lessonCurrent : ''} ${lesson.status === 'COMPLETED' ? styles.lessonCompleted : ''}`}
                                            >
                                                <span className={styles.lessonIcon} aria-hidden="true">
                                                    {meta.icon}
                                                </span>
                                                <div className={styles.lessonInfo}>
                                                    <span className={styles.lessonTitle}>{lesson.title}</span>
                                                    <span className={styles.lessonMeta}>
                                                        {meta.label}
                                                        {lesson.status === 'COMPLETED' && lesson.bestScore !== null && (
                                                            <> · Điểm: {lesson.bestScore}</>
                                                        )}
                                                    </span>
                                                </div>
                                                <span className={`${styles.lessonStatus} ${STATUS_CLASS[lesson.status]}`}>
                                                    {lesson.status === 'LOCKED' && lesson.lockReason
                                                        ? lesson.lockReason
                                                        : STATUS_LABEL[lesson.status]}
                                                </span>
                                                {isActionable && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        padding="A"
                                                        fontSize={14}
                                                        textColor="black"
                                                        className={styles.lessonAction}
                                                        onClick={() => handleLessonAction(lesson.id, lesson.status)}
                                                    >
                                                        {lesson.status === 'COMPLETED' ? 'Xem lại' : lesson.status === 'IN_PROGRESS' ? 'Tiếp tục' : 'Bắt đầu'}
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CourseOverviewPage;
