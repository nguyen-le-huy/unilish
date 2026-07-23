import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, Plus, RefreshCw, Save, Trash2, Video } from 'lucide-react';
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
import { shadowingAdminApi } from './api';
import type { ShadowingCue, ShadowingVideo } from './types';

const QUERY_KEY = ['shadowing', 'admin-videos'] as const;

const statusLabel: Record<ShadowingVideo['status'], string> = {
    processing: 'Đang xử lý',
    ready: 'Sẵn sàng',
    failed: 'Lỗi xử lý',
};

const toSeconds = (milliseconds: number) => Number((milliseconds / 1000).toFixed(2));
const toMilliseconds = (seconds: string) => Math.max(0, Math.round((Number(seconds) || 0) * 1000));

export default function ShadowingManagementPage() {
    const queryClient = useQueryClient();
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [draftCues, setDraftCues] = useState<ShadowingCue[]>([]);
    const [autoTranslate, setAutoTranslate] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const videosQuery = useQuery({
        queryKey: QUERY_KEY,
        queryFn: shadowingAdminApi.listVideos,
        refetchInterval: (query) => query.state.data?.data.some((video) => video.status === 'processing') ? 3000 : false,
    });

    const videos = useMemo(() => videosQuery.data?.data ?? [], [videosQuery.data]);
    const selectedVideo = videos.find((video) => video.videoId === selectedVideoId) ?? null;

    useEffect(() => {
        if (!selectedVideo || isDirty) return;
        const syncId = window.setTimeout(() => {
            setDraftCues(selectedVideo.cues.map((cue) => ({ ...cue })));
        }, 0);
        return () => window.clearTimeout(syncId);
    }, [isDirty, selectedVideo]);

    const selectVideo = (video: ShadowingVideo) => {
        if (isDirty && !window.confirm('Bỏ các thay đổi transcript chưa lưu?')) return;
        setSelectedVideoId(video.videoId);
        setDraftCues(video.cues.map((cue) => ({ ...cue })));
        setAutoTranslate(false);
        setIsDirty(false);
    };

    const submitMutation = useMutation({
        mutationFn: () => shadowingAdminApi.submitVideo(youtubeUrl.trim()),
        onSuccess: (payload) => {
            setYoutubeUrl('');
            setSelectedVideoId(payload.video?.videoId ?? payload.videoId ?? null);
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success(payload.status === 'ready' ? 'Video đã có trong thư viện' : 'Đã gửi video để xử lý');
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể thêm video')),
    });

    const saveMutation = useMutation({
        mutationFn: () => shadowingAdminApi.updateCues(selectedVideoId ?? '', draftCues, autoTranslate),
        onSuccess: (payload) => {
            queryClient.setQueryData(QUERY_KEY, (current: typeof videosQuery.data) => current ? {
                ...current,
                data: current.data.map((video) => video.videoId === payload.video.videoId ? payload.video : video),
            } : current);
            setDraftCues(payload.video.cues.map((cue) => ({ ...cue })));
            setIsDirty(false);
            setAutoTranslate(false);
            toast.success('Đã lưu transcript');
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể lưu transcript')),
    });

    const deleteMutation = useMutation({
        mutationFn: (videoId: string) => shadowingAdminApi.deleteVideo(videoId),
        onSuccess: () => {
            setSelectedVideoId(null);
            setDraftCues([]);
            setIsDirty(false);
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success('Đã xóa video');
        },
        onError: (error) => toast.error(getApiErrorMessage(error, 'Không thể xóa video')),
    });

    const updateCue = (index: number, patch: Partial<ShadowingCue>) => {
        setDraftCues((current) => current.map((cue, cueIndex) => cueIndex === index ? { ...cue, ...patch } : cue));
        setIsDirty(true);
    };

    const moveCue = (index: number, direction: -1 | 1) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= draftCues.length) return;
        setDraftCues((current) => {
            const next = [...current];
            [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
            return next;
        });
        setIsDirty(true);
    };

    const removeCue = (index: number) => {
        setDraftCues((current) => current.filter((_, cueIndex) => cueIndex !== index));
        setIsDirty(true);
    };

    const addCue = () => {
        const lastEndMs = draftCues.at(-1)?.endMs ?? 0;
        setDraftCues((current) => [...current, {
            id: `cue-${Date.now()}`,
            text: '',
            translationVi: null,
            vocabulary: [],
            commonPhrases: [],
            startMs: lastEndMs,
            endMs: lastEndMs + 3000,
        }]);
        setIsDirty(true);
    };

    const hasInvalidCue = draftCues.length === 0
        || draftCues.some((cue) => !cue.text.trim() || cue.endMs < cue.startMs);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Học với YouTube"
                description="Quản lý video YouTube và transcript dùng trong thư viện luyện tập của học viên."
            >
                <Button variant="outline" onClick={() => void videosQuery.refetch()} disabled={videosQuery.isFetching}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${videosQuery.isFetching ? 'animate-spin' : ''}`} />Làm mới
                </Button>
            </PageHeader>

            <Card>
                <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-end">
                    <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor="shadowing-youtube-url">Đường dẫn YouTube</Label>
                        <Input
                            id="shadowing-youtube-url"
                            value={youtubeUrl}
                            onChange={(event) => setYoutubeUrl(event.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && youtubeUrl.trim()) submitMutation.mutate();
                            }}
                        />
                    </div>
                    <Button disabled={!youtubeUrl.trim() || submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                        <Plus className="mr-2 h-4 w-4" />{submitMutation.isPending ? 'Đang gửi...' : 'Thêm video'}
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <Card className="h-fit">
                    <CardHeader><CardTitle className="text-base">Thư viện ({videosQuery.data?.pagination.total ?? 0})</CardTitle></CardHeader>
                    <CardContent className="max-h-[72vh] space-y-2 overflow-y-auto">
                        {videosQuery.isLoading && <p className="text-sm text-muted-foreground">Đang tải video...</p>}
                        {!videosQuery.isLoading && videos.length === 0 && <p className="text-sm text-muted-foreground">Chưa có video nào.</p>}
                        {videos.map((video) => (
                            <button
                                key={video.videoId}
                                type="button"
                                onClick={() => selectVideo(video)}
                                className={`grid w-full grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-lg border p-2 text-left transition-colors ${selectedVideoId === video.videoId ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                            >
                                <img src={video.thumbnailUrl} alt="" className="aspect-video w-full rounded object-cover" />
                                <span className="min-w-0 space-y-1">
                                    <strong className="line-clamp-2 block text-sm leading-5">{video.title}</strong>
                                    <span className="flex flex-wrap items-center gap-2">
                                        <Badge variant={video.status === 'ready' ? 'default' : video.status === 'failed' ? 'destructive' : 'secondary'}>{statusLabel[video.status]}</Badge>
                                        <small className="text-muted-foreground">{video.cues.length} câu</small>
                                    </span>
                                </span>
                            </button>
                        ))}
                    </CardContent>
                </Card>

                {!selectedVideo && (
                    <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><Video className="h-8 w-8" /><p>Chọn một video để xem và chỉnh transcript.</p></CardContent></Card>
                )}

                {selectedVideo && (
                    <div className="space-y-5">
                        <Card>
                            <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 space-y-2">
                                    <CardTitle className="text-lg">{selectedVideo.title}</CardTitle>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant={selectedVideo.status === 'ready' ? 'default' : selectedVideo.status === 'failed' ? 'destructive' : 'secondary'}>{statusLabel[selectedVideo.status]}</Badge>
                                        <span>{selectedVideo.videoId}</span>
                                        <a className="inline-flex items-center gap-1 hover:text-foreground" href={`https://www.youtube.com/watch?v=${selectedVideo.videoId}`} target="_blank" rel="noreferrer">Mở YouTube <ExternalLink className="h-3.5 w-3.5" /></a>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => {
                                        if (window.confirm('Xóa video này khỏi thư viện luyện tập?')) deleteMutation.mutate(selectedVideo.videoId);
                                    }}
                                ><Trash2 className="mr-2 h-4 w-4" />Xóa video</Button>
                            </CardHeader>
                        </Card>

                        {selectedVideo.status !== 'ready' ? (
                            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">{selectedVideo.status === 'processing' ? 'Hệ thống đang tạo transcript. Danh sách sẽ tự cập nhật.' : 'Video xử lý lỗi. Xóa video và thêm lại để thử lại.'}</CardContent></Card>
                        ) : (
                            <Card>
                                <CardHeader className="gap-4 border-b md:flex-row md:items-center md:justify-between">
                                    <div><CardTitle className="text-base">Transcript</CardTitle><p className="mt-1 text-sm text-muted-foreground">Chỉnh nội dung và mốc thời gian của từng câu.</p></div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2"><Switch checked={autoTranslate} onCheckedChange={setAutoTranslate} id="auto-translate" /><Label htmlFor="auto-translate">AI dịch lại câu đã sửa</Label></div>
                                        <Button variant="outline" size="sm" onClick={addCue}><Plus className="mr-2 h-4 w-4" />Thêm câu</Button>
                                        <Button size="sm" disabled={!isDirty || hasInvalidCue || saveMutation.isPending} onClick={() => saveMutation.mutate()}><Save className="mr-2 h-4 w-4" />{saveMutation.isPending ? 'Đang lưu...' : 'Lưu transcript'}</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-5">
                                    {draftCues.map((cue, index) => (
                                        <div key={cue.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[72px_minmax(0,1fr)_150px_150px_auto]">
                                            <div className="text-sm font-medium">Câu {String(index + 1).padStart(2, '0')}</div>
                                            <div className="space-y-2">
                                                <Textarea value={cue.text} rows={2} onChange={(event) => updateCue(index, { text: event.target.value })} placeholder="Nội dung tiếng Anh" />
                                                <Input value={cue.translationVi ?? ''} onChange={(event) => updateCue(index, { translationVi: event.target.value || null })} placeholder="Bản dịch tiếng Việt" />
                                            </div>
                                            <div className="space-y-2"><Label>Bắt đầu (giây)</Label><Input type="number" min={0} step="0.01" value={toSeconds(cue.startMs)} onChange={(event) => updateCue(index, { startMs: toMilliseconds(event.target.value) })} /></div>
                                            <div className="space-y-2"><Label>Kết thúc (giây)</Label><Input type="number" min={0} step="0.01" value={toSeconds(cue.endMs)} onChange={(event) => updateCue(index, { endMs: toMilliseconds(event.target.value) })} /></div>
                                            <div className="flex items-start gap-1">
                                                <Button variant="ghost" size="icon" title="Chuyển lên" disabled={index === 0} onClick={() => moveCue(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" title="Chuyển xuống" disabled={index === draftCues.length - 1} onClick={() => moveCue(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" title="Xóa câu" onClick={() => removeCue(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                    {draftCues.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Video chưa có câu transcript. Chọn “Thêm câu” để bắt đầu.</p>}
                                    {hasInvalidCue && <p className="text-sm text-destructive">Mỗi câu cần có nội dung và thời gian kết thúc không nhỏ hơn thời gian bắt đầu.</p>}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
