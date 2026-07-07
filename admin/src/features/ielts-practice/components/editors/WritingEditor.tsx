/* ──────────────────────────────────────────────────────────────
 * WritingEditor — Academic Task 1 chart content editor
 * FR-13/AC-17: Prompt, instruction, imageAsset, minWords
 * FR-19/AC-24: Image asset reference
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ApiResponse } from '@/types/api';
import type { WritingAdminContent } from '../../types';

interface Props {
  value: WritingAdminContent;
  onChange: (value: WritingAdminContent) => void;
}

export function WritingEditor({ value, onChange }: Props) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const update = useCallback(
    (patch: Partial<WritingAdminContent>) => {
      onChange({ ...value, ...patch });
    },
    [value, onChange],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Vui lòng chọn file ảnh hợp lệ');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'ielts-practice/writing/images');

      setIsUploadingImage(true);
      try {
        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>(
          '/upload',
          formData,
        );
        update({ imageAssetId: response.data.data.url });
        toast.success('Đã upload ảnh lên R2');
      } catch {
        toast.error('Upload ảnh thất bại');
      } finally {
        setIsUploadingImage(false);
      }
    },
    [update],
  );

  return (
    <div className="space-y-6">
      {/* ── Prompt ────────────────────────────────────────── */}
      <div>
        <Label>Đề bài (prompt)</Label>
        <Textarea
          value={value.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          rows={3}
          placeholder="The chart below shows the percentage of water used for different agricultural products..."
        />
      </div>

      {/* ── Instruction ────────────────────────────────────── */}
      <div>
        <Label>Hướng dẫn</Label>
        <Textarea
          value={value.instruction}
          onChange={(e) => update({ instruction: e.target.value })}
          rows={2}
          placeholder="Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
        />
      </div>

      {/* ── Image ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Image R2 URL</Label>
          <div className="flex gap-2">
            <Input
              value={value.imageAssetId}
              onChange={(e) => update({ imageAssetId: e.target.value })}
              placeholder="Upload ảnh hoặc dán URL R2"
            />
            <label className="shrink-0">
              <input
                className="hidden"
                type="file"
                accept="image/*"
                disabled={isUploadingImage}
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await uploadImage(file);
                  input.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingImage}
                asChild
              >
                <span className="gap-2">
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploadingImage ? 'Đang upload' : 'Upload'}
                </span>
              </Button>
            </label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            File ảnh sẽ được upload qua endpoint R2 hiện có của dự án.
          </p>
        </div>
        <div>
          <Label>Alt text cho ảnh</Label>
          <Input
            value={value.imageAlt}
            onChange={(e) => update({ imageAlt: e.target.value })}
            placeholder="Mô tả ngắn về biểu đồ"
          />
        </div>
      </div>

      {value.imageAssetId && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Preview ảnh</p>
          <img
            src={value.imageAssetId}
            alt={value.imageAlt || 'Writing task chart preview'}
            className="max-h-80 w-full rounded-md border bg-white object-contain"
          />
        </div>
      )}

      {/* ── Min words ──────────────────────────────────────── */}
      <div className="max-w-xs">
        <Label>Số từ tối thiểu</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value.minWords}
            onChange={(e) => update({ minWords: Math.max(1, Number(e.target.value)) })}
            min={1}
          />
          <span className="text-sm text-muted-foreground">từ</span>
        </div>
      </div>

      {/* ── Grading rubric version ────────────────────────── */}
      <div className="max-w-xs">
        <Label>Phiên bản rubric chấm (tùy chọn)</Label>
        <Input
          value={value.gradingRubricVersion ?? ''}
          onChange={(e) => update({ gradingRubricVersion: e.target.value || undefined })}
          placeholder="v1"
        />
      </div>
    </div>
  );
}
