import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { LanguageIdentityCard } from '../../components/LanguageIdentityCard/LanguageIdentityCard';
import { useLanguageForm } from '../../hooks/useLanguageForm';
import { useLanguageDetail } from '../../hooks/useLanguages';

export default function LanguageEditorPage() {
    const navigate = useNavigate();
    const { code } = useParams<{ code: string }>();

    const { data: languageDetail, isLoading } = useLanguageDetail(code);
    const { form, onSubmit, isSubmitting, isCreateMode } = useLanguageForm({ code, languageDetail });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageHeader
                    title={
                        isCreateMode
                            ? 'Tạo Ngôn ngữ mới'
                            : `Cấu hình Ngôn ngữ: ${languageDetail?.name ?? ''}`
                    }
                    description="Identity + Greeting + Greeting Sound"
                />
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/curriculum/languages')}
                        aria-label="Go back to language list"
                    >
                        Quay lại
                    </Button>
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={!form.formState.isValid || isSubmitting}
                        aria-label={isCreateMode ? 'Create language' : 'Save language changes'}
                    >
                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                        {isCreateMode ? 'Tạo mới' : 'Lưu thay đổi'}
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isLoading && !isCreateMode ? (
                <div className="grid gap-4 xl:grid-cols-12">
                    <Skeleton className="xl:col-span-12 h-[560px] rounded-xl" />
                </div>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                        <div className="grid gap-4 xl:grid-cols-12">
                            <LanguageIdentityCard
                                form={form}
                                isCreateMode={isCreateMode}
                                className="xl:col-span-12"
                            />
                        </div>
                    </form>
                </Form>
            )}
        </div>
    );
}

