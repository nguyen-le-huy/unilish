import { useState, useCallback, useRef } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Mic, Loader2, Volume2, UploadCloud, VolumeX } from 'lucide-react';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import type { IModuleSpeaking, ISpeakingCueCard, ISpeakingQuestion } from '../../../types';

// ─── Local Types ──────────────────────────────────────────────────────────────

interface QuestionDraft {
    id: string;
    text: string;
    /** Cue card hints for part 2 ("You should say") */
    cueHints?: string[];
    /** Persisted R2 URL (from API response) */
    audioUrl?: string;
    /** R2 object key — needed for deletion */
    audioKey?: string;
    /** Local object URL for preview before upload */
    audioPreviewUrl?: string;
    /** Pending file waiting to be uploaded */
    pendingAudioFile?: File;
    /** Upload in progress */
    isUploadingAudio?: boolean;
}

type SpeakingPart = 'part1' | 'part2' | 'part3';

// ─── Schema ───────────────────────────────────────────────────────────────────

const speakingSchema = z.object({
    name: z.string().min(1, 'Bắt buộc'),
});

type SpeakingFormValues = z.infer<typeof speakingSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

type LegacySpeakingTopic = {
    text?: string;
    topic?: string;
    question?: string;
    questionText?: string;
    content?: string;
    prompt?: string;
    title?: string;
    label?: string;
    value?: string;
    stem?: string;
    audioKey?: string;
    audio?: {
        key?: string;
    };
};

const TOPIC_TEXT_KEYS: Array<keyof LegacySpeakingTopic> = [
    'text',
    'topic',
    'question',
    'questionText',
    'content',
    'prompt',
    'title',
    'label',
    'value',
    'stem',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const trimIfString = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';

const toStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value.map((item) => trimIfString(item)).filter((item) => item.length > 0)
        : [];

const normalizeStringList = (value?: string[]): string[] =>
    Array.from(new Set((value ?? []).map((item) => item.trim()).filter((item) => item.length > 0)));

const pickTopicText = (topic: LegacySpeakingTopic | string): string => {
    if (typeof topic === 'string') return topic.trim();

    for (const key of TOPIC_TEXT_KEYS) {
        const candidate = trimIfString(topic[key]);
        if (candidate.length > 0) {
            return candidate;
        }
    }

    // Defensive fallback for unknown legacy shapes.
    // Example: { question: { text: '...' } } or { payload: { prompt: '...' } }
    for (const value of Object.values(topic)) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
            continue;
        }

        if (!isRecord(value)) {
            continue;
        }

        for (const nestedValue of Object.values(value)) {
            const nestedText = trimIfString(nestedValue);
            if (nestedText.length > 0) {
                return nestedText;
            }
        }
    }

    return '';
};

/**
 * Reconstruct QuestionDraft from persisted speaking topics.
 * Supports both the current shape ({ text, audioKey }) and legacy formats.
 */
const topicsToQuestionDrafts = (topics?: (ISpeakingQuestion | LegacySpeakingTopic | string)[]): QuestionDraft[] =>
    (topics ?? [])
        .map((q) => {
            const text = pickTopicText(q);
            const audioKey = typeof q === 'string' ? undefined : (q.audioKey ?? q.audio?.key);
            return {
                id: uid(),
                text,
                audioKey,
            };
        })
        .filter((q) => q.text.length > 0 || !!q.audioKey);

/** Reconstruct QuestionDraft from persisted ISpeakingCueCard (preserves audioKey) */
type LegacyCueCard = Partial<ISpeakingCueCard> & {
    topic?: string;
    prompt?: string;
    hints?: string[];
    bullets?: string[];
    points?: string[];
};

const cueCardsToQuestionDrafts = (cueCards?: (ISpeakingCueCard | LegacyCueCard | string)[]): QuestionDraft[] =>
    (cueCards ?? [])
        .map((cueCard) => {
            if (typeof cueCard === 'string') {
                return { id: uid(), text: cueCard.trim(), cueHints: [] };
            }

            const text = pickTopicText(cueCard);
            const shouldSay = toStringArray(cueCard.shouldSay);
            const fallbackHints = [
                ...toStringArray(cueCard.hints),
                ...toStringArray(cueCard.bullets),
                ...toStringArray(cueCard.points),
            ];

            return {
                id: uid(),
                text,
                audioKey: cueCard.audioKey,
                cueHints: normalizeStringList(shouldSay.length > 0 ? shouldSay : fallbackHints),
            };
        })
        .filter((q) => q.text.length > 0 || !!q.audioKey || (q.cueHints?.length ?? 0) > 0);

// ─── API calls ────────────────────────────────────────────────────────────────

async function apiUploadQuestionAudio(
    file: File,
    part: SpeakingPart,
    questionId: string,
): Promise<{ key: string; url: string }> {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<{ data: { key: string; url: string } }>(
        `/audio/speaking-questions/upload?part=${part}&questionId=${questionId}`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
}

async function apiDeleteQuestionAudio(key: string): Promise<void> {
    await apiClient.delete('/audio/speaking-questions', { data: { key } });
}

/**
 * Always stream audio through the server proxy instead of loading R2 URLs directly.
 * R2 buckets may not have public access — the server fetches via credentials and pipes.
 * GET /api/audio/{key}  is public (no auth required).
 */
const r2ProxyUrl = (key: string): string => {
    const base = (import.meta.env.VITE_API_URL as string | undefined)
        ?? 'http://localhost:5432/api';
    return `${base.replace(/\/$/, '')}/audio/${key}`;
};

/** Resolve the best playable URL for a draft (proxy > local blob > nothing) */
const resolveAudioSrc = (q: { audioKey?: string; audioPreviewUrl?: string }): string | undefined => {
    if (q.audioKey) return r2ProxyUrl(q.audioKey);
    return q.audioPreviewUrl; // local blob URL (before first upload)
};

// ─── Sub-component: AddQuestionForm ───────────────────────────────────────────

interface AddQuestionFormProps {
    part: SpeakingPart;
    onAdd: (draft: QuestionDraft) => void;
    onCancel: () => void;
    placeholder?: string;
}

function AddQuestionForm({ part, onAdd, onCancel, placeholder }: AddQuestionFormProps) {
    const [text, setText] = useState('');
    const [cueHintInput, setCueHintInput] = useState('');
    const [cueHints, setCueHints] = useState<string[]>([]);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | undefined>();
    const [isUploading, setIsUploading] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFile(file);
        setAudioPreviewUrl(URL.createObjectURL(file));
    };

    const submitQuestion = useCallback(async () => {
        if (!text.trim()) return;

        const questionId = uid();
        let audioUrl: string | undefined;
        let audioKey: string | undefined;

        if (audioFile) {
            setIsUploading(true);
            try {
                const result = await apiUploadQuestionAudio(audioFile, part, questionId);
                audioUrl = result.url;
                audioKey = result.key;
            } catch {
                toast.error('Tải âm thanh lên thất bại. Thử lại sau.');
                setIsUploading(false);
                return;
            } finally {
                setIsUploading(false);
            }
        }

        onAdd({
            id: questionId,
            text: text.trim(),
            cueHints: part === 'part2' ? normalizeStringList(cueHints) : undefined,
            audioUrl,
            audioKey,
            audioPreviewUrl,
        });
    }, [text, cueHints, audioFile, audioPreviewUrl, part, onAdd]);

    const addCueHint = useCallback(() => {
        const next = cueHintInput.trim();
        if (!next) return;
        setCueHints((prev) => normalizeStringList([...prev, next]));
        setCueHintInput('');
    }, [cueHintInput]);

    const handleContainerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter') return;
        if (isUploading || !text.trim()) return;
        e.preventDefault();
        e.stopPropagation();
        void submitQuestion();
    }, [isUploading, text, submitQuestion]);

    return (
        <div
            className="mt-2 rounded-md border border-dashed border-border bg-muted/40 p-3 space-y-3"
            onKeyDown={handleContainerKeyDown}
        >
            <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Nội dung câu hỏi *</label>
                <Input
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={placeholder ?? 'Nhập câu hỏi...'}
                    className="h-8 text-sm"
                    disabled={isUploading}
                />
            </div>

            <div className="space-y-2">
                <p className="text-xs font-medium text-foreground flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    Âm thanh câu hỏi (tùy chọn)
                </p>

                {/* Hidden native input */}
                <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioChange}
                    disabled={isUploading}
                />

                {audioFile ? (
                    /* After selecting a file — show name + player + change button */
                    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-background p-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground truncate" title={audioFile.name}>
                                🎵 {audioFile.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => audioInputRef.current?.click()}
                                disabled={isUploading}
                                className="shrink-0 text-xs text-primary underline-offset-2 hover:underline disabled:opacity-40"
                            >
                                Thay đổi
                            </button>
                        </div>
                        {audioPreviewUrl && (
                            <audio controls src={audioPreviewUrl} className="h-8 w-full" />
                        )}
                    </div>
                ) : (
                    /* No file yet — show prominent upload button */
                    <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                    >
                        <Mic className="h-4 w-4" />
                        Chọn file âm thanh...
                    </button>
                )}
            </div>

            {part === 'part2' && (
                <div className="space-y-2 rounded-md border border-border/60 bg-background p-2.5">
                    <p className="text-xs font-medium text-foreground">You should say (gợi ý)</p>

                    {cueHints.length > 0 ? (
                        <ul className="space-y-1">
                            {cueHints.map((hint, index) => (
                                <li key={`${hint}-${index}`} className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="flex-1 text-xs text-foreground break-words">{hint}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCueHints((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
                                        }}
                                        className="text-xs text-destructive hover:underline"
                                    >
                                        Xóa
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs italic text-muted-foreground">Chưa có gợi ý.</p>
                    )}

                    <div className="flex items-center gap-2">
                        <Input
                            value={cueHintInput}
                            onChange={(e) => setCueHintInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                addCueHint();
                            }}
                            placeholder="When and where it was"
                            className="h-8 text-xs"
                            disabled={isUploading}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={addCueHint} disabled={isUploading}>
                            Thêm ý
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isUploading}>
                    Hủy
                </Button>
                <Button
                    type="button"
                    size="sm"
                    disabled={!text.trim() || isUploading}
                    onClick={() => {
                        void submitQuestion();
                    }}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Đang tải...
                        </>
                    ) : (
                        'Thêm câu hỏi'
                    )}
                </Button>
            </div>
        </div>
    );
}

// ─── Sub-component: QuestionPartEditor ───────────────────────────────────────

interface QuestionPartEditorProps {
    part: SpeakingPart;
    label: string;
    questions: QuestionDraft[];
    onAdd: (draft: QuestionDraft) => void;
    onRemove: (id: string) => void;
    onUpdate: (draft: QuestionDraft) => void;
    addPlaceholder?: string;
}

function QuestionPartEditor({
    part,
    label,
    questions,
    onAdd,
    onRemove,
    onUpdate,
    addPlaceholder,
}: QuestionPartEditorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [managingSoundId, setManagingSoundId] = useState<string | null>(null);
    const [replacingAudioId, setReplacingAudioId] = useState<string | null>(null);
    const [deletingAudioId, setDeletingAudioId] = useState<string | null>(null);
    const [cueHintInputById, setCueHintInputById] = useState<Record<string, string>>({});
    const soundInputRef = useRef<HTMLInputElement>(null);

    const handleAdd = (draft: QuestionDraft) => {
        onAdd(draft);
        setIsOpen(false);
    };

    const handleRemove = useCallback(async (q: QuestionDraft) => {
        setDeletingId(q.id);
        try {
            if (q.audioKey) {
                await apiDeleteQuestionAudio(q.audioKey);
            }
            onRemove(q.id);
            toast.success('Đã xóa câu hỏi');
        } catch {
            toast.error('Xóa âm thanh thất bại. Thử lại sau.');
        } finally {
            setDeletingId(null);
        }
    }, [onRemove]);

    /** Replace or add audio for an existing question */
    const handleReplaceAudio = useCallback(async (
        e: React.ChangeEvent<HTMLInputElement>,
        q: QuestionDraft,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setReplacingAudioId(q.id);
        try {
            if (q.audioKey) await apiDeleteQuestionAudio(q.audioKey);
            const result = await apiUploadQuestionAudio(file, part, q.id);
            // In-place update — question stays in its position
            onUpdate({ ...q, audioUrl: result.url, audioKey: result.key, audioPreviewUrl: undefined });
            toast.success('Đã cập nhật âm thanh');
        } catch {
            toast.error('Cập nhật âm thanh thất bại.');
        } finally {
            setReplacingAudioId(null);
        }
    }, [part, onUpdate]);

    /** Delete only the audio of a question (keep the question text) */
    const handleDeleteAudioOnly = useCallback(async (q: QuestionDraft) => {
        if (!q.audioKey) return;
        setDeletingAudioId(q.id);
        try {
            await apiDeleteQuestionAudio(q.audioKey);
            // In-place update — strip audio fields, keep question
            onUpdate({ ...q, audioUrl: undefined, audioKey: undefined, audioPreviewUrl: undefined });
            setManagingSoundId(null);
            toast.success('Đã xóa âm thanh');
        } catch {
            toast.error('Xóa âm thanh thất bại.');
        } finally {
            setDeletingAudioId(null);
        }
    }, [onUpdate]);

    const addCueHint = useCallback((q: QuestionDraft) => {
        const draftText = (cueHintInputById[q.id] ?? '').trim();
        if (!draftText) return;
        const nextHints = normalizeStringList([...(q.cueHints ?? []), draftText]);
        onUpdate({ ...q, cueHints: nextHints });
        setCueHintInputById((prev) => ({ ...prev, [q.id]: '' }));
    }, [cueHintInputById, onUpdate]);

    const removeCueHint = useCallback((q: QuestionDraft, index: number) => {
        const nextHints = (q.cueHints ?? []).filter((_, itemIndex) => itemIndex !== index);
        onUpdate({ ...q, cueHints: nextHints });
    }, [onUpdate]);

    const updateCueHintText = useCallback((q: QuestionDraft, index: number, value: string) => {
        const nextHints = [...(q.cueHints ?? [])];
        nextHints[index] = value;
        onUpdate({ ...q, cueHints: nextHints });
    }, [onUpdate]);

    return (
        <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{label}</span>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => setIsOpen((v) => !v)}
                >
                    <Plus className="h-3 w-3" />
                    Thêm câu hỏi
                </Button>
            </div>

            {questions.length === 0 && !isOpen && (
                <p className="text-xs text-muted-foreground italic">
                    Chưa có câu hỏi. Hệ thống sẽ sinh tự động.
                </p>
            )}

            {questions.length > 0 && (
                <ul className="space-y-1.5">
                    {questions.map((q, idx) => {
                        const isDeleting = deletingId === q.id;
        return (
                            <li
                                key={q.id}
                                className="rounded-md bg-muted/50 text-xs"
                            >
                                {/* ── Question row ── */}
                                <div className="flex items-start gap-2 px-3 py-2">
                                    <span className="mt-0.5 shrink-0 font-medium text-muted-foreground w-4">
                                        {idx + 1}.
                                    </span>
                                    <p className={`flex-1 min-w-0 break-words ${q.text ? 'text-foreground' : 'italic text-muted-foreground'}`}>
                                        {q.text || 'Chưa có nội dung câu hỏi'}
                                    </p>

                                    {/* Manage Sound button */}
                                    <button
                                        type="button"
                                        aria-label={`Quản lý âm thanh câu hỏi ${idx + 1}`}
                                        title="Quản lý âm thanh"
                                        onClick={() =>
                                            setManagingSoundId((prev) => (prev === q.id ? null : q.id))
                                        }
                                        className={`shrink-0 rounded p-0.5 transition-colors ${
                                            managingSoundId === q.id
                                                ? 'text-primary'
                                                : 'text-muted-foreground hover:text-primary'
                                        }`}
                                    >
                                        <Volume2 className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Delete question button */}
                                    <button
                                        type="button"
                                        aria-label={`Xóa câu hỏi ${idx + 1}`}
                                        title="Xóa câu hỏi"
                                        onClick={() => handleRemove(q)}
                                        disabled={isDeleting}
                                        className="shrink-0 rounded p-0.5 text-destructive opacity-70 hover:opacity-100 transition-opacity disabled:opacity-30"
                                    >
                                        {isDeleting
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <Trash2 className="h-3.5 w-3.5" />
                                        }
                                    </button>
                                </div>

                                {part === 'part2' && (
                                    <div className="mx-3 mb-2 rounded-md border border-border/70 bg-background p-2.5 space-y-2">
                                        <p className="text-[11px] font-semibold text-foreground">You should say</p>

                                        {(q.cueHints?.length ?? 0) > 0 ? (
                                            <ul className="space-y-1.5">
                                                {(q.cueHints ?? []).map((hint, hintIndex) => (
                                                    <li key={`${q.id}-hint-${hintIndex}`} className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">•</span>
                                                        <Input
                                                            value={hint}
                                                            onChange={(e) => updateCueHintText(q, hintIndex, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key !== 'Enter') return;
                                                                e.preventDefault();
                                                            }}
                                                            className="h-7 text-xs"
                                                            placeholder={`Gợi ý ${hintIndex + 1}`}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 text-destructive"
                                                            onClick={() => removeCueHint(q, hintIndex)}
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs italic text-muted-foreground">Chưa có gợi ý cho cue card này.</p>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={cueHintInputById[q.id] ?? ''}
                                                onChange={(e) => {
                                                    const nextValue = e.target.value;
                                                    setCueHintInputById((prev) => ({ ...prev, [q.id]: nextValue }));
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key !== 'Enter') return;
                                                    e.preventDefault();
                                                    addCueHint(q);
                                                }}
                                                className="h-8 text-xs"
                                                placeholder="Thêm ý mới..."
                                            />
                                            <Button type="button" size="sm" variant="outline" onClick={() => addCueHint(q)}>
                                                Thêm ý
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* ── Sound management panel (collapsible) ── */}
                                {managingSoundId === q.id && (
                                    <div className="mx-3 mb-2 rounded-md border border-border bg-background p-2.5 space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            Quản lý âm thanh
                                        </p>

                                        {/* Current audio preview */}
                                        {resolveAudioSrc(q) ? (
                                            <>
                                                <audio
                                                    controls
                                                    src={resolveAudioSrc(q)}
                                                    className="h-8 w-full"
                                                    aria-label={`Nghe câu hỏi ${idx + 1}`}
                                                />
                                                {q.audioKey && (
                                                    <p className="text-[10px] text-muted-foreground truncate" title={q.audioKey}>
                                                        R2: {q.audioKey}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Chưa có âm thanh.</p>
                                        )}

                                        {/* Hidden file input for replace */}
                                        <input
                                            ref={soundInputRef}
                                            type="file"
                                            accept="audio/*"
                                            className="hidden"
                                            onChange={(e) => handleReplaceAudio(e, q)}
                                        />

                                        <div className="flex items-center gap-2">
                                            {/* Upload / Replace button */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    soundInputRef.current?.click();
                                                }}
                                                disabled={replacingAudioId === q.id}
                                                className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs hover:bg-accent transition-colors disabled:opacity-40"
                                            >
                                                {replacingAudioId === q.id
                                                    ? <><Loader2 className="h-3 w-3 animate-spin" /> Đang tải...</>
                                                    : <><UploadCloud className="h-3 w-3" /> {q.audioUrl ? 'Thay thế' : 'Tải lên'}</>}
                                            </button>

                                            {/* Delete audio only button */}
                                            {q.audioUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAudioOnly(q)}
                                                    disabled={deletingAudioId === q.id}
                                                    className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                                                >
                                                    {deletingAudioId === q.id
                                                        ? <><Loader2 className="h-3 w-3 animate-spin" /> Đang xóa...</>
                                                        : <><VolumeX className="h-3 w-3" /> Xóa âm thanh</>}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );

                    })}
                </ul>
            )}

            {isOpen && (
                <AddQuestionForm
                    part={part}
                    onAdd={handleAdd}
                    onCancel={() => setIsOpen(false)}
                    placeholder={addPlaceholder}
                />
            )}
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    defaultValues?: Partial<IModuleSpeaking>;
    order: number;
    onSave: (data: IModuleSpeaking) => void;
    onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpeakingModuleForm({ defaultValues, order, onSave, onCancel }: Props) {
    // ── Per-part question state ──────────────────────────────────────────────
    const [part1Questions, setPart1Questions] = useState<QuestionDraft[]>(
        topicsToQuestionDrafts(defaultValues?.parts?.part1?.topics),
    );
    const [part2Questions, setPart2Questions] = useState<QuestionDraft[]>(
        cueCardsToQuestionDrafts(defaultValues?.parts?.part2?.cueCards),
    );
    const [part3Questions, setPart3Questions] = useState<QuestionDraft[]>(
        topicsToQuestionDrafts(defaultValues?.parts?.part3?.topics),
    );

    const addQuestion =
        (setter: React.Dispatch<React.SetStateAction<QuestionDraft[]>>) =>
        (draft: QuestionDraft) =>
            setter((prev) => [...prev, draft]);

    const removeQuestion =
        (setter: React.Dispatch<React.SetStateAction<QuestionDraft[]>>) =>
        (id: string) =>
            setter((prev) => prev.filter((q) => q.id !== id));

    const updateQuestion =
        (setter: React.Dispatch<React.SetStateAction<QuestionDraft[]>>) =>
        (draft: QuestionDraft) =>
            setter((prev) => prev.map((q) => (q.id === draft.id ? draft : q)));

    // ── Form ────────────────────────────────────────────────────────────────
    const form = useForm<SpeakingFormValues>({
        resolver: zodResolver(speakingSchema) as Resolver<SpeakingFormValues>,
        defaultValues: {
            name: defaultValues?.name ?? 'Speaking Test',
        },
    });

    function onSubmit(values: SpeakingFormValues) {
        onSave({
            order,
            type: 'speaking',
            name: values.name,
            parts: {
                part1: {
                    // Persist text + audioKey so that re-opening the form restores audio
                    topics: part1Questions.map((q) => ({ text: q.text, audioKey: q.audioKey })),
                },
                part2: {
                    cueCards: part2Questions.map((q) => ({
                        level: 'mid' as const,
                        text: q.text,
                        audioKey: q.audioKey,
                        shouldSay: normalizeStringList(q.cueHints),
                    })),
                },
                part3: {
                    topics: part3Questions.map((q) => ({ text: q.text, audioKey: q.audioKey })),
                },
            },
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* ── Basic Info ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel>Tên module <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <Separator />

                {/* ── Questions per Part ─────────────────────────────────── */}
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium">Câu hỏi thủ công — Speaking</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Mỗi câu hỏi có thể đính kèm âm thanh. Audio được lưu trên Cloudflare R2.
                            <br />Có thể để trống để hệ thống sinh câu hỏi tự động.
                        </p>
                    </div>

                    <QuestionPartEditor
                        part="part1"
                        label="Part 1 — Personal Questions"
                        questions={part1Questions}
                        onAdd={addQuestion(setPart1Questions)}
                        onRemove={removeQuestion(setPart1Questions)}
                        onUpdate={updateQuestion(setPart1Questions)}
                        addPlaceholder="Do you work or are you a student?"
                    />

                    <QuestionPartEditor
                        part="part2"
                        label="Part 2 — Cue Cards"
                        questions={part2Questions}
                        onAdd={addQuestion(setPart2Questions)}
                        onRemove={removeQuestion(setPart2Questions)}
                        onUpdate={updateQuestion(setPart2Questions)}
                        addPlaceholder="Describe your favorite place in your city."
                    />

                    <QuestionPartEditor
                        part="part3"
                        label="Part 3 — Discussion Questions"
                        questions={part3Questions}
                        onAdd={addQuestion(setPart3Questions)}
                        onRemove={removeQuestion(setPart3Questions)}
                        onUpdate={updateQuestion(setPart3Questions)}
                        addPlaceholder="What are the advantages and disadvantages of living in a big city?"
                    />
                </div>

                {/* ── Actions ────────────────────────────────────────────── */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
                    <Button type="submit">Lưu module</Button>
                </div>
            </form>
        </Form>
    );
}
