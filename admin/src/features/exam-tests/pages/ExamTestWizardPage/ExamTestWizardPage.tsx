import { useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { ExamTestWizard } from '../../components/wizard/ExamTestWizard';
import type { ExamFormat } from '../../types';

const isExamFormat = (value: string | null): value is ExamFormat => {
    return value === 'toeic_lr' || value === 'ielts';
};

export default function ExamTestWizardPage() {
    const { id } = useParams<{ id?: string }>();
    const [searchParams] = useSearchParams();
    const formatParam = searchParams.get('format');
    const presetFormat = isExamFormat(formatParam) ? formatParam : undefined;

    return (
        <div className="flex flex-col gap-4 p-6">
            <PageHeader
                title={id ? 'Chỉnh sửa Bài Thi' : 'Tạo Bài Thi Mới'}
                description="Cấu hình đề thi TOEIC L&R và IELTS."
            />
            <ExamTestWizard editId={id} presetFormat={presetFormat} />
        </div>
    );
}
