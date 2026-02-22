import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { RadarSkillChart } from '../../components/RadarSkillChart/RadarSkillChart';
import { SkillWeightEditor } from '../../components/SkillWeightEditor/SkillWeightEditor';
import { AISandbox } from '../../components/AISandbox/AISandbox';
import { SupportedLanguagesCard } from '../../components/SupportedLanguagesCard/SupportedLanguagesCard';
import { useLearningGoalDetail } from '../../hooks/useLearningGoals';
import { useCreateLearningGoal, useUpdateLearningGoal } from '../../hooks/useLearningGoalMutations';
import { useGoalForm, type GoalFormValues } from '../../hooks/useLearningGoalForm';

// ─── Local sub-component ────────────────────────────────────────────────────
type IgnoredSkillValue = string;

const QUICK_SKILLS: IgnoredSkillValue[] = ['Chính tả', 'Dấu câu', 'Trang trọng', 'Phát âm'];

function IgnoredSkillsField({
    value,
    onChange,
}: {
    value: IgnoredSkillValue[];
    onChange: (v: IgnoredSkillValue[]) => void;
}) {
    const [inputValue, setInputValue] = useState('');
    const isComposing = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const remove = (skill: IgnoredSkillValue) => onChange(value.filter((s) => s !== skill));

    const commit = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        if (!value.includes(trimmed)) {
            onChange([...value, trimmed]);
        }
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (isComposing.current) return;
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
            remove(value[value.length - 1]);
        }
    };

    const toggleQuick = (skill: IgnoredSkillValue) => {
        if (value.includes(skill)) remove(skill);
        else onChange([...value, skill]);
    };

    return (
        <div className="space-y-2">
            {/* Tag input box */}
            <div
                className="flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 min-h-10 cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                onClick={() => inputRef.current?.focus()}
            >
                {value.map((skill) => (
                    <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                        {skill}
                        <button
                            type="button"
                            className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus:outline-none"
                            onClick={(e) => { e.stopPropagation(); remove(skill); }}
                        >
                            ×
                        </button>
                    </Badge>
                ))}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onCompositionStart={() => { isComposing.current = true; }}
                    onCompositionEnd={(e) => {
                        isComposing.current = false;
                        setInputValue((e.target as HTMLInputElement).value);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => { if (!isComposing.current) commit(inputValue); }}
                    placeholder={value.length === 0 ? 'Nhập hoặc chọn bên dưới…' : ''}
                    className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>

            {/* Quick-pick badges */}
            <div className="flex flex-wrap gap-1.5">
                {QUICK_SKILLS.map((skill) => (
                    <Badge
                        key={skill}
                        variant={value.includes(skill) ? 'default' : 'outline'}
                        className="cursor-pointer select-none"
                        onClick={() => toggleQuick(skill)}
                    >
                        {value.includes(skill) ? `✓ ${skill}` : `+ ${skill}`}
                    </Badge>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GoalEditorPage() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const isCreateMode = !slug || slug === 'new';

    const { data: goalDetail, isLoading } = useLearningGoalDetail(slug);
    const createMutation = useCreateLearningGoal();
    const updateMutation = useUpdateLearningGoal();

    const { form, handleTitleChange } = useGoalForm({ isCreateMode, goalDetail });
    const skillWeights = form.watch('skillWeights');

    const isPending = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = form.handleSubmit(async (values) => {
        try {
            if (isCreateMode) {
                await createMutation.mutateAsync(values);
                navigate('/curriculum/goals');
            } else {
                await updateMutation.mutateAsync({ slug: slug as string, payload: values });
            }
        } catch {
            return;
        }
    });

    const currentSlug = isCreateMode ? '' : (slug ?? '');

    if (isLoading && !isCreateMode) {
        return <Skeleton className="h-80 w-full rounded-lg" />;
    }

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <PageHeader
                        title={isCreateMode ? 'Tạo Mục tiêu mới' : `Chỉnh sửa: ${goalDetail?.title ?? ''}`}
                        description="Ma trận kỹ năng + Chân dung AI + Khu vực thử nghiệm + TTS ngôn ngữ"
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
                    <div className="xl:col-span-5 space-y-4">
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

                        <Card>
                            <CardHeader><CardTitle>Ma trận kỹ năng</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <RadarSkillChart skillWeights={skillWeights} />
                                <SkillWeightEditor
                                    skillWeights={skillWeights}
                                    onChange={(next) => form.setValue('skillWeights', next, { shouldValidate: true })}
                                />
                                <FormField control={form.control} name="skillWeights" render={() => <FormMessage />} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="xl:col-span-4 space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Thiết lập chân dung AI</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <FormField control={form.control} name="systemPrompt" render={({ field }) => (
                                    <FormItem><FormLabel>Prompt hệ thống</FormLabel><FormControl>
                                        <Textarea {...field} rows={12} placeholder="Mô tả hành vi huấn luyện, giọng điệu và ràng buộc cho AI..." />
                                    </FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="ignoredSkills" render={() => (
                                    <FormItem>
                                        <FormLabel>Kỹ năng bỏ qua</FormLabel>
                                        <FormControl>
                                            <IgnoredSkillsField
                                                value={form.watch('ignoredSkills')}
                                                onChange={(v) => form.setValue('ignoredSkills', v, { shouldValidate: true })}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </CardContent>
                        </Card>
                        <SupportedLanguagesCard />
                    </div>

                    <div className="xl:col-span-3 space-y-4">
                        <AISandbox
                            slug={currentSlug}
                            systemPrompt={form.watch('systemPrompt')}
                            skillWeights={skillWeights}
                            ignoredSkills={form.watch('ignoredSkills')}
                        />
                    </div>
                </div>
            </form>
        </Form>
    );
}
