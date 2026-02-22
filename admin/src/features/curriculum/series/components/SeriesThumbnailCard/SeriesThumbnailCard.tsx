import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { BookOpen, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SeriesFormValues } from '../../hooks/useCourseSeriesForm';

interface SeriesThumbnailCardProps {
    /** Pass form.control — useWatch requires control, not the full form object */
    control: Control<SeriesFormValues>;
    /** Called when user picks a new local file (uploaded automatically on Save) */
    onFileSelect: (file: File | null) => void;
    /** Called when user removes the current committed Cloudinary URL */
    onClear: () => void;
    className?: string;
}

/**
 * Thumbnail picker for Course Series.
 *
 * UX flow:
 *  1. User picks a file → instant local ObjectURL preview
 *  2. User clicks “Lưu thay đổi” → parent uploads to Cloudinary then saves
 *
 * No separate Upload button — upload is deferred to the form’s Save action.
 */
export function SeriesThumbnailCard({
    control,
    onFileSelect,
    onClear,
    className,
}: SeriesThumbnailCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [imgError, setImgError] = useState(false);

    // useWatch — correct pattern for child components in RHF v7
    const thumbnailUrl = useWatch({ control, name: 'thumbnailUrl' });

    // Reset img error when the committed URL changes
    useEffect(() => {
        setImgError(false);
    }, [thumbnailUrl]);

    // Generate and revoke Object URL for instant local preview
    useEffect(() => {
        if (!pendingFile) {
            setLocalPreviewUrl('');
            return;
        }
        const url = URL.createObjectURL(pendingFile);
        setLocalPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [pendingFile]);

    const previewUrl = localPreviewUrl || (!imgError ? (thumbnailUrl ?? '') : '');

    const handleFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0] ?? null;
            setPendingFile(file);
            onFileSelect(file);
        },
        [onFileSelect],
    );

    const handleClear = useCallback(() => {
        onClear();
        onFileSelect(null);
        setPendingFile(null);
        setLocalPreviewUrl('');
        setImgError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [onClear, onFileSelect]);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Thumbnail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* File picker */}
                <div className="space-y-1.5">
                    <Label htmlFor="series-thumbnail-file">Ảnh đại diện</Label>
                    <Input
                        ref={fileInputRef}
                        id="series-thumbnail-file"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        aria-label="Chọn ảnh thumbnail"
                    />
                    {pendingFile ? (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            Ảnh sẽ được tải lên khi bạn nhấn <strong>Lưu</strong>.
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Hỗ trợ JPG, PNG, WebP. Tỉ lệ 16:9 được khuyến nghị.
                        </p>
                    )}
                </div>

                {/* Preview */}
                <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                    {previewUrl ? (
                        <>
                            <img
                                src={previewUrl}
                                alt="Xem trước thumbnail"
                                className="h-full w-full object-cover"
                                onError={() => setImgError(true)}
                            />
                            {/* Clear button — only for committed Cloudinary URL, not for pending local file */}
                            {thumbnailUrl && !pendingFile && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="absolute right-1.5 top-1.5 h-6 w-6 opacity-80 hover:opacity-100"
                                    onClick={handleClear}
                                    aria-label="Xóa thumbnail"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
                            <BookOpen className="h-10 w-10 opacity-30" aria-hidden="true" />
                            <span className="text-xs">Chưa có ảnh</span>
                        </div>
                    )}
                </div>

                {/* Current committed URL */}
                {thumbnailUrl && !pendingFile && (
                    <p
                        className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
                        title={thumbnailUrl}
                        aria-label="URL thumbnail hiện tại"
                    >
                        {thumbnailUrl}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
