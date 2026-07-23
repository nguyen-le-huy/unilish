import { useCallback, useEffect, useMemo, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save, Upload } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SupportedLanguagesCard } from '../../components/SupportedLanguagesCard/SupportedLanguagesCard';
import { useLearningGoalDetail } from '../../hooks/useLearningGoals';
import { useCreateLearningGoal, useUpdateLearningGoal, useUploadGoalIcon } from '../../hooks/useLearningGoalMutations';
import { useGoalForm } from '../../hooks/useLearningGoalForm';

export default function GoalEditorPage() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const isCreateMode = !slug || slug === 'new';

    const { data: goalDetail, isLoading } = useLearningGoalDetail(slug);
    const createMutation = useCreateLearningGoal();
    const updateMutation = useUpdateLearningGoal();
    const uploadIconMutation = useUploadGoalIcon();

    const { form, handleTitleChange } = useGoalForm({ isCreateMode, goalDetail });
    const iconFile = form.watch('_iconFile');
    const iconUrl = form.watch('iconUrl');
    const localPreviewUrl = useMemo(() => (iconFile ? URL.createObjectURL(iconFile) : ''), [iconFile]);
    useEffect(() => {
        return () => {
            if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        };
    }, [localPreviewUrl]);

    const previewIconUrl = localPreviewUrl || iconUrl;

    const handleIconFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? undefined;
        form.setValue('_iconFile', file);
    }, [form]);

    const isPending = createMutation.isPending || updateMutation.isPending || uploadIconMutation.isPending;

    const handleSubmit = form.handleSubmit(async (values) => {
        try {
            let resolvedIconUrl = values.iconUrl?.trim() || undefined;

            if (values._iconFile) {
                const uploaded = await uploadIconMutation.mutateAsync(values._iconFile);
                resolvedIconUrl = uploaded.url;
                form.setValue('iconUrl', uploaded.url);
                form.setValue('_iconFile', undefined);
            }

            if (isCreateMode) {
                await createMutation.mutateAsync({
                    ...values,
                    iconUrl: resolvedIconUrl,
                });
                navigate('/curriculum/goals');
            } else {
                await updateMutation.mutateAsync({
                    slug: slug as string,
                    payload: {
                        ...values,
                        iconUrl: resolvedIconUrl ?? null,
                    },
                });
            }
        } catch {
            return;
        }
    });

    if (isLoading && !isCreateMode) {
        return <Skeleton className="h-80 w-full rounded-lg" />;
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <PageHeader
                        title={isCreateMode ? 'Tạo Mục tiêu mới' : `Chỉnh sửa: ${goalDetail?.title ?? ''}`}
                        description="Quản lý thông tin cơ bản và ngôn ngữ áp dụng cho mục tiêu học tập"
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={() => navigate('/curriculum/goals')}>Quay lại</Button>
                        <Button type="submit" disabled={!form.formState.isValid || isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {isCreateMode ? 'Tạo mới' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-12">
                    <div className="xl:col-span-7">
                        <Card>
                            <CardHeader><CardTitle>Thông tin mục tiêu</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem><FormLabel>Tiêu đề</FormLabel><FormControl>
                                        <Input {...field} onChange={(e) => handleTitleChange(e.target.value)} />
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="slug" render={({ field }) => (
                                    <FormItem><FormLabel>Slug</FormLabel><FormControl>
                                        <Input {...field} disabled={!isCreateMode} />
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="space-y-2">
                                    <FormLabel htmlFor="goal-icon-file">Icon mục tiêu (Cloudinary)</FormLabel>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <Input
                                            id="goal-icon-file"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleIconFileChange}
                                            aria-label="Upload goal icon image"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={async () => {
                                                if (!iconFile) return;
                                                const uploaded = await uploadIconMutation.mutateAsync(iconFile);
                                                form.setValue('iconUrl', uploaded.url, { shouldValidate: true });
                                                form.setValue('_iconFile', undefined);
                                            }}
                                            disabled={!iconFile || uploadIconMutation.isPending}
                                            aria-label="Upload selected goal icon"
                                        >
                                            {uploadIconMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4 mr-2" />
                                            )}
                                            Upload
                                        </Button>
                                    </div>
                                    {previewIconUrl ? (
                                        <div className="flex items-center gap-2 rounded-md border p-2 w-fit">
                                            <img src={previewIconUrl} alt="Goal icon preview" className="h-8 w-8 rounded object-cover" />
                                            <span className="text-xs text-muted-foreground">Preview</span>
                                        </div>
                                    ) : null}
                                </div>
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem><FormLabel>Mô tả</FormLabel><FormControl>
                                        <Textarea {...field} rows={2} placeholder="Mô tả ngắn gọn về mục tiêu này..." />
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                                    <FormItem><FormLabel>Đối tượng mục tiêu</FormLabel><FormControl>
                                        <Input {...field} placeholder="VD: Người đi du lịch, kỹ sư phần mềm..." />
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                            </CardContent>
                        </Card>

                    </div>

                    <div className="xl:col-span-5">
                        <SupportedLanguagesCard />
                    </div>
                </div>
            </form>
        </Form>
    );
}
