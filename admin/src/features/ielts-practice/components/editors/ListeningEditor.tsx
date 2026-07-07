/* ──────────────────────────────────────────────────────────────
 * ListeningEditor — Form completion content editor
 * FR-13/AC-17: Flexible item count, each with before/after/acceptedAnswers
 * FR-19/AC-24: Audio asset reference
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useState } from 'react';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ApiResponse } from '@/types/api';
import type { ListeningAdminContent } from '../../types';

interface Props {
  value: ListeningAdminContent;
  onChange: (value: ListeningAdminContent) => void;
}

function resolveAudioPreviewUrl(src: string): string {
  const audioUrl = src.trim();
  if (!audioUrl) return '';
  if (audioUrl.includes('/api/audio/')) return audioUrl;

  const apiBaseRaw = String(import.meta.env.VITE_API_URL || 'http://localhost:5432/api');
  const apiBase = apiBaseRaw.replace(/\/+$/, '');

  if (audioUrl.startsWith('http')) {
    try {
      const url = new URL(audioUrl);
      const key = url.pathname.replace(/^\/+/, '');
      return key ? `${apiBase}/audio/${key}` : audioUrl;
    } catch {
      return audioUrl;
    }
  }

  return `${apiBase}/audio/${audioUrl.replace(/^\/+/, '')}`;
}

export function ListeningEditor({ value, onChange }: Props) {
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const audioPreviewUrl = resolveAudioPreviewUrl(value.audioAssetId);

  const update = useCallback(
    (patch: Partial<ListeningAdminContent>) => {
      onChange({ ...value, ...patch });
    },
    [value, onChange],
  );

  const updateItem = useCallback(
    (index: number, patch: Partial<ListeningAdminContent['items'][0]>) => {
      const items = value.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      update({ items });
    },
    [value, update],
  );

  const uploadAudio = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('audio/')) {
        toast.error('Vui lòng chọn file audio hợp lệ');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'ielts-practice/listening/audio');

      setIsUploadingAudio(true);
      try {
        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>(
          '/upload',
          formData,
        );
        update({ audioAssetId: response.data.data.url });
        toast.success('Đã upload audio lên R2');
      } catch {
        toast.error('Upload audio thất bại');
      } finally {
        setIsUploadingAudio(false);
      }
    },
    [update],
  );

  const addItem = useCallback(() => {
    const order = value.items.length + 1;
    update({
      items: [
        ...value.items,
        {
          id: `l-${String(order).padStart(2, '0')}`,
          order,
          before: '',
          after: '',
          acceptedAnswers: [''],
        },
      ],
    });
  }, [value, update]);

  const removeItem = useCallback(
    (index: number) => {
      if (value.items.length <= 1) return;
      const items = value.items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, order: i + 1 }));
      update({ items });
    },
    [value, update],
  );

  const addAcceptedAnswer = useCallback(
    (itemIndex: number) => {
      const items = value.items.map((item, i) =>
        i === itemIndex
          ? { ...item, acceptedAnswers: [...item.acceptedAnswers, ''] }
          : item,
      );
      update({ items });
    },
    [value, update],
  );

  const updateAcceptedAnswer = useCallback(
    (itemIndex: number, answerIndex: number, text: string) => {
      const items = value.items.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              acceptedAnswers: item.acceptedAnswers.map((a, j) =>
                j === answerIndex ? text : a,
              ),
            }
          : item,
      );
      update({ items });
    },
    [value, update],
  );

  const removeAcceptedAnswer = useCallback(
    (itemIndex: number, answerIndex: number) => {
      const items = value.items.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              acceptedAnswers: item.acceptedAnswers.filter((_, j) => j !== answerIndex),
            }
          : item,
      );
      update({ items });
    },
    [value, update],
  );

  return (
    <div className="space-y-6">
      {/* ── Instruction & Heading ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Hướng dẫn</Label>
          <Textarea
            value={value.instruction}
            onChange={(e) => update({ instruction: e.target.value })}
            rows={2}
            placeholder="Write ONE WORD AND/OR A NUMBER for each answer."
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Heading</Label>
          <Input
            value={value.heading}
            onChange={(e) => update({ heading: e.target.value })}
            placeholder="Form completion"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Audio R2 URL</Label>
          <div className="flex gap-2">
            <Input
              value={value.audioAssetId}
              onChange={(e) => update({ audioAssetId: e.target.value })}
              placeholder="Upload audio hoặc dán URL R2"
            />
            <label className="shrink-0">
              <input
                className="hidden"
                type="file"
                accept="audio/*"
                disabled={isUploadingAudio}
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await uploadAudio(file);
                  input.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingAudio}
                asChild
              >
                <span className="gap-2">
                  {isUploadingAudio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploadingAudio ? 'Đang upload' : 'Upload'}
                </span>
              </Button>
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            File audio sẽ được upload qua endpoint R2 hiện có của dự án.
          </p>
          {audioPreviewUrl && (
            <audio controls className="mt-3 w-full" src={audioPreviewUrl}>
              Trình duyệt không hỗ trợ audio.
            </audio>
          )}
        </div>
      </div>

      {/* ── Items ─────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label className="text-base font-semibold">
            Câu hỏi ({value.items.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm câu hỏi
          </Button>
        </div>

        <div className="space-y-4">
          {value.items.map((item, index) => (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Câu {item.order}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch
                      checked={item.caseSensitive ?? false}
                      onCheckedChange={(v) => updateItem(index, { caseSensitive: v })}
                    />
                    Phân biệt hoa/thường
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeItem(index)}
                    disabled={value.items.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Text trước (before)</Label>
                  <Input
                    value={item.before}
                    onChange={(e) => updateItem(index, { before: e.target.value })}
                    placeholder="The answer is ___"
                  />
                </div>
                <div>
                  <Label className="text-xs">Text sau (after)</Label>
                  <Input
                    value={item.after}
                    onChange={(e) => updateItem(index, { after: e.target.value })}
                    placeholder="___ and then..."
                  />
                </div>
              </div>

              {/* Accepted answers */}
              <div className="mt-3">
                <Label className="text-xs">Đáp án chấp nhận được</Label>
                <div className="mt-1 space-y-1.5">
                  {item.acceptedAnswers.map((answer, ai) => (
                    <div key={ai} className="flex items-center gap-1.5">
                      <Input
                        value={answer}
                        onChange={(e) =>
                          updateAcceptedAnswer(index, ai, e.target.value)
                        }
                        className="flex-1"
                        placeholder="Đáp án…"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeAcceptedAnswer(index, ai)}
                        disabled={item.acceptedAnswers.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-1 h-auto px-0 text-xs"
                  onClick={() => addAcceptedAnswer(index)}
                >
                  + Thêm đáp án khác
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
