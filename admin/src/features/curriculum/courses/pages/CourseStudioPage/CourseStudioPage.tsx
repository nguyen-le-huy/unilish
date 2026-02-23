import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useCourseDetail, useCourseTree } from '../../hooks/useCourses';
import { useCourseStudioStore } from '../../stores/course-studio.store';
import { CurriculumTree } from '../../components/CurriculumTree/CurriculumTree';
import { CourseEditor } from '../../components/CourseEditor/CourseEditor';
import { UnitEditor } from '../../components/UnitEditor/UnitEditor';
import { LessonEditor } from '../../components/LessonEditor/LessonEditor';
import { VocabStudio } from '../../components/VocabStudio/VocabStudio';
import { GrammarStudio } from '../../components/GrammarStudio/GrammarStudio';
import { ReadingStudio } from '../../components/ReadingStudio/ReadingStudio';
import type { UnitWithLessons, LessonSummary } from '../../types/course.types';

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkspacePanel({ courseId }: { courseId: string }) {
    const { selectedNode } = useCourseStudioStore();

    if (!selectedNode) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <p>Chọn một node trong tree để chỉnh sửa</p>
            </div>
        );
    }

    if (selectedNode.type === 'course') {
        return <CourseEditor courseId={selectedNode.id} />;
    }

    if (selectedNode.type === 'unit') {
        return <WorkspaceUnitPanel courseId={courseId} unitId={selectedNode.id} />;
    }

    if (selectedNode.type === 'lesson') {
        return <WorkspaceLessonPanel courseId={courseId} lessonId={selectedNode.id} />;
    }

    return null;
}

// Find unit data from the already-cached course tree
function WorkspaceUnitPanel({ courseId, unitId }: { courseId: string; unitId: string }) {
    const { data: tree } = useCourseTree(courseId);
    const unit = tree?.units.find((u: UnitWithLessons) => u._id === unitId);

    if (!unit) {
        return (
            <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return <UnitEditor unit={unit} courseId={courseId} />;
}

function WorkspaceLessonPanel({ courseId, lessonId }: { courseId: string; lessonId: string }) {
    const { data: tree } = useCourseTree(courseId);
    const lesson = tree?.units
        .flatMap((u: UnitWithLessons) => u.lessons)
        .find((l: LessonSummary) => l._id === lessonId);

    if (!lesson) {
        return (
            <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    // VOCAB lessons get the full-featured VocabStudio
    if (lesson.type === 'VOCAB') {
        return (
            <ErrorBoundary>
                <VocabStudio lesson={lesson} />
            </ErrorBoundary>
        );
    }

    // GRAMMAR lessons get the Grammar Studio
    if (lesson.type === 'GRAMMAR') {
        return (
            <ErrorBoundary>
                <GrammarStudio lesson={lesson} />
            </ErrorBoundary>
        );
    }

    // READING lessons get the Reading Studio
    if (lesson.type === 'READING') {
        return (
            <ErrorBoundary>
                <ReadingStudio lesson={lesson} courseLevel={tree?.level ?? 'A1'} />
            </ErrorBoundary>
        );
    }

    return <LessonEditor lesson={lesson} courseId={courseId} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseStudioPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { setActiveCourseId, reset } = useCourseStudioStore();
    const { data: course, isLoading } = useCourseDetail(courseId);

    // Sync URL param into Zustand store
    useEffect(() => {
        if (courseId) {
            setActiveCourseId(courseId);
        }
        return () => {
            reset();
        };
    }, [courseId, setActiveCourseId, reset]);

    if (!courseId) {
        return null;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
            {/* Studio Topbar */}
            <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    aria-label="Quay lại"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Quay lại
                </Button>

                <div className="h-4 w-px bg-border" />

                {isLoading ? (
                    <Skeleton className="h-5 w-40" />
                ) : (
                    <span className="text-sm font-medium">{course?.name ?? 'Xưởng Khóa Học'}</span>
                )}
            </div>

            {/* 2-Column Layout: Tree | Workspace */}
            <div className="flex flex-1 overflow-hidden">
                {/* Col 1: Curriculum Tree */}
                <div className="w-1/4 overflow-hidden border-r bg-background">
                    <CurriculumTree courseId={courseId} />
                </div>

                {/* Col 2: Workspace Editor */}
                <div className="flex-1 overflow-hidden bg-background">
                    <WorkspacePanel courseId={courseId} />
                </div>
            </div>
        </div>
    );
}
