import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
import { aiVoiceContentApi } from './api';
import type { AiVoiceScenario, AiVoiceTopic, AiVoiceTopicPayload } from './types';

const QUERY_KEY = ['ai-voice', 'admin-topics'] as const;

const createEmptyTopic = (): AiVoiceTopicPayload => ({
    slug: '',
    title: '',
    description: '',
    icon: '✦',
    isActive: true,
    order: 0,
    scenarios: [],
});

const createEmptyScenario = (order: number): AiVoiceScenario => ({
    title: '',
    description: '',
    isActive: true,
    order,
});

const toPayload = (topic: AiVoiceTopic): AiVoiceTopicPayload => ({
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    icon: topic.icon,
    isActive: topic.isActive,
    order: topic.order,
    scenarios: topic.scenarios,
});

const toSlug = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function AiVoiceContentPage() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [draft, setDraft] = useState<AiVoiceTopicPayload>(createEmptyTopic);

    const { data: topics = [], isLoading } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: aiVoiceContentApi.getTopics,
    });

    const saveMutation = useMutation({
        mutationFn: () => selectedId
            ? aiVoiceContentApi.updateTopic(selectedId, draft)
            : aiVoiceContentApi.createTopic(draft),
        onSuccess: (saved) => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            setSelectedId(saved._id);
            setDraft(toPayload(saved));
            toast.success(selectedId ? 'Đã cập nhật chủ đề hội thoại' : 'Đã tạo chủ đề hội thoại');
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể lưu chủ đề hội thoại')),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => aiVoiceContentApi.deleteTopic(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            setSelectedId(null);
            setDraft(createEmptyTopic());
            toast.success('Đã xóa chủ đề hội thoại');
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể xóa chủ đề hội thoại')),
    });

    const selectTopic = (topic: AiVoiceTopic) => {
        setSelectedId(topic._id);
        setDraft(toPayload(topic));
    };
    const startCreate = () => {
        setSelectedId(null);
        setDraft({ ...createEmptyTopic(), order: topics.length });
    };
    const updateScenario = (index: number, patch: Partial<AiVoiceScenario>) => {
        setDraft((current) => ({
            ...current,
            scenarios: current.scenarios.map((scenario, scenarioIndex) =>
                scenarioIndex === index ? { ...scenario, ...patch } : scenario),
        }));
    };
    const removeScenario = (index: number) => {
        setDraft((current) => ({
            ...current,
            scenarios: current.scenarios
                .filter((_, scenarioIndex) => scenarioIndex !== index)
                .map((scenario, scenarioIndex) => ({ ...scenario, order: scenarioIndex })),
        }));
    };

    const canSave = draft.title.trim().length >= 2
        && draft.slug.trim().length >= 2
        && draft.description.trim().length >= 2
        && draft.scenarios.every((scenario) => scenario.title.trim().length >= 2 && scenario.description.trim().length >= 5);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Chủ đề giao tiếp với AI"
                description="Admin biên soạn chủ đề và tình huống; hệ thống không tự sinh tình huống cho học sinh."
            >
                <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" />Thêm chủ đề</Button>
            </PageHeader>

            <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader><CardTitle className="text-base">Danh sách chủ đề</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
                        {!isLoading && topics.length === 0 && <p className="text-sm text-muted-foreground">Chưa có chủ đề nào.</p>}
                        {topics.map((topic) => (
                            <button
                                key={topic._id}
                                type="button"
                                onClick={() => selectTopic(topic)}
                                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${selectedId === topic._id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                            >
                                <span className="text-xl" aria-hidden="true">{topic.icon}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <strong className="truncate text-sm">{topic.title}</strong>
                                        <Badge variant={topic.isActive ? 'default' : 'secondary'}>{topic.isActive ? 'Hiện' : 'Ẩn'}</Badge>
                                    </span>
                                    <small className="text-muted-foreground">{topic.scenarios.length} tình huống</small>
                                </span>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-5">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base"><MessageCircle className="h-4 w-4" />Thông tin chủ đề</CardTitle>
                            <div className="flex items-center gap-2">
                                {selectedId && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (window.confirm('Xóa chủ đề và toàn bộ tình huống bên trong?')) deleteMutation.mutate(selectedId);
                                        }}
                                    ><Trash2 className="mr-2 h-4 w-4" />Xóa</Button>
                                )}
                                <Button size="sm" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                                    <Save className="mr-2 h-4 w-4" />Lưu thay đổi
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2"><Label>Tiêu đề</Label><Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value, ...(!selectedId && !current.slug ? { slug: toSlug(event.target.value) } : {}) }))} placeholder="Ví dụ: Du lịch" /></div>
                            <div className="grid grid-cols-[90px_1fr] gap-3">
                                <div className="space-y-2"><Label>Biểu tượng</Label><Input value={draft.icon} maxLength={10} onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value }))} /></div>
                                <div className="space-y-2"><Label>Slug</Label><Input value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: toSlug(event.target.value) }))} placeholder="du-lich" /></div>
                            </div>
                            <div className="space-y-2 md:col-span-2"><Label>Mô tả</Label><Textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Mô tả ngắn hiển thị cho học sinh" /></div>
                            <div className="flex items-center gap-3"><Switch checked={draft.isActive} onCheckedChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))} /><Label>Hiển thị cho học sinh</Label></div>
                            <div className="space-y-2"><Label>Thứ tự hiển thị</Label><Input type="number" min={0} value={draft.order} onChange={(event) => setDraft((current) => ({ ...current, order: Number(event.target.value) || 0 }))} /></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <div><CardTitle className="text-base">Tình huống hội thoại</CardTitle><p className="mt-1 text-sm text-muted-foreground">Nội dung này được đưa trực tiếp vào ngữ cảnh hội thoại của AI.</p></div>
                            <Button variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, scenarios: [...current.scenarios, createEmptyScenario(current.scenarios.length)] }))}><Plus className="mr-2 h-4 w-4" />Thêm tình huống</Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {draft.scenarios.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Chưa có tình huống. Hãy thêm tình huống đầu tiên.</div>}
                            {draft.scenarios.map((scenario, index) => (
                                <div key={scenario.id ?? `new-${index}`} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_130px_auto]">
                                    <div className="space-y-3">
                                        <div className="space-y-2"><Label>Tên tình huống {index + 1}</Label><Input value={scenario.title} onChange={(event) => updateScenario(index, { title: event.target.value })} placeholder="Ví dụ: Làm thủ tục nhận phòng khách sạn" /></div>
                                        <div className="space-y-2"><Label>Mô tả vai trò và bối cảnh</Label><Textarea value={scenario.description} onChange={(event) => updateScenario(index, { description: event.target.value })} placeholder="Bạn là khách du lịch đang làm thủ tục nhận phòng..." /></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2"><Label>Thứ tự</Label><Input type="number" min={0} value={scenario.order} onChange={(event) => updateScenario(index, { order: Number(event.target.value) || 0 })} /></div>
                                        <div className="flex items-center gap-2"><Switch checked={scenario.isActive} onCheckedChange={(checked) => updateScenario(index, { isActive: checked })} /><Label>Hiển thị</Label></div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeScenario(index)} aria-label={`Xóa tình huống ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
