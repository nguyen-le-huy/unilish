import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormControl } from '@/components/ui/form';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    partIndex: number;
    groupStart: number;
    groupSize: number;
    sharedImageUrls: string[];
    /** Whether the upload replaces (false) or appends (true) the existing images. Only true for Part 7. */
    isPart7: boolean;
    uploadingKey: string | null;
    onMoveImage: (fromIndex: number, toIndex: number) => void;
    onRemoveImage: (imageIndex: number) => void;
    onUploadImage: (file: File) => Promise<void>;
    onAddImageUrl: (url: string) => void;
    onSetSingleImageUrl: (url: string) => void;
}

// ─── MCQGroupMediaPanel ───────────────────────────────────────────────────────

export function MCQGroupMediaPanel({
    partIndex,
    groupStart,
    groupSize,
    sharedImageUrls,
    isPart7,
    uploadingKey,
    onMoveImage,
    onRemoveImage,
    onUploadImage,
    onAddImageUrl,
    onSetSingleImageUrl,
}: Props) {
    const [urlDraft, setUrlDraft] = useState('');
    const uploadFieldKey = `${partIndex}-group-${groupStart}-image`;
    const isUploading = uploadingKey === uploadFieldKey;

    return (
        <div className="rounded-lg border bg-background p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Media chung cho cụm {groupSize} câu
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isPart7 ? (
                    <FormItem className="sm:col-span-2">
                        <FormLabel>Thêm URL ảnh chung (Cloudinary)</FormLabel>
                        <div className="flex items-center gap-2">
                            <Input
                                className="h-10"
                                placeholder="https://..."
                                value={urlDraft}
                                onChange={(event) => setUrlDraft(event.target.value)}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const trimmed = urlDraft.trim();
                                    if (!trimmed) return;
                                    onAddImageUrl(trimmed);
                                    setUrlDraft('');
                                }}
                            >
                                + Thêm
                            </Button>
                        </div>
                    </FormItem>
                ) : (
                    <FormItem>
                        <FormLabel>Hình chung (Cloudinary)</FormLabel>
                        <FormControl>
                            <Input
                                className="h-10"
                                placeholder="https://..."
                                value={sharedImageUrls[0] ?? ''}
                                onChange={(event) => onSetSingleImageUrl(event.target.value)}
                            />
                        </FormControl>
                    </FormItem>
                )}
            </div>

            {sharedImageUrls.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Thứ tự ảnh hiển thị</p>
                    <div className="space-y-2">
                        {sharedImageUrls.map((imageUrl, imageIndex) => (
                            <div
                                key={`${partIndex}-${groupStart}-edit-image-${imageIndex}`}
                                className="rounded-lg border p-2 bg-muted/20 space-y-2"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-muted-foreground">Ảnh {imageIndex + 1}</span>
                                    {isPart7 && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={imageIndex === 0}
                                                onClick={() => onMoveImage(imageIndex, imageIndex - 1)}
                                            >
                                                Lên
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={imageIndex === sharedImageUrls.length - 1}
                                                onClick={() => onMoveImage(imageIndex, imageIndex + 1)}
                                            >
                                                Xuống
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                onClick={() => onRemoveImage(imageIndex)}
                                            >
                                                Xóa
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="rounded-lg border p-2 bg-background flex justify-center">
                                    <img
                                        src={imageUrl}
                                        alt={`Group ${partIndex + 1}-${groupStart + 1} preview ${imageIndex + 1}`}
                                        className="max-h-56 w-auto object-contain rounded"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="inline-flex">
                    <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={async (event) => {
                            const inputElement = event.currentTarget;
                            const file = event.target.files?.[0];
                            if (!file) return;
                            await onUploadImage(file);
                            inputElement.value = '';
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={isUploading}
                        asChild
                    >
                        <span>
                            {isUploading
                                ? 'Đang upload ảnh...'
                                : isPart7
                                    ? 'Upload hình đề bài lên Cloudinary'
                                    : 'Upload hình chung lên Cloudinary'}
                        </span>
                    </Button>
                </label>
            </div>
        </div>
    );
}
