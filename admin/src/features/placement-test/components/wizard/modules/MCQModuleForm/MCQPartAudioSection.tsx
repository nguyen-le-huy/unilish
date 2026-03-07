import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { resolveAudioPreviewUrl } from './utils/audioUrl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    sharedAudioUrl: string;
    isUploading: boolean;
    onChangeUrl: (url: string) => void;
    onUploadFile: (file: File) => Promise<void>;
}

// ─── MCQPartAudioSection ──────────────────────────────────────────────────────

export function MCQPartAudioSection({
    sharedAudioUrl,
    isUploading,
    onChangeUrl,
    onUploadFile,
}: Props) {
    const previewUrl = resolveAudioPreviewUrl(sharedAudioUrl);

    return (
        <div className="md:col-span-2 rounded-xl border bg-background p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Audio chung cho cả Part
            </p>

            <FormItem>
                <FormLabel>Audio URL (R2)</FormLabel>
                <FormControl>
                    <Input
                        className="h-10"
                        placeholder="https://..."
                        value={sharedAudioUrl}
                        onChange={(event) => onChangeUrl(event.target.value)}
                    />
                </FormControl>
            </FormItem>

            {sharedAudioUrl ? (
                <audio controls className="w-full" src={previewUrl}>
                    Trình duyệt không hỗ trợ audio.
                </audio>
            ) : (
                <p className="text-sm text-muted-foreground">Chưa có audio chung cho part</p>
            )}

            <label className="inline-flex">
                <input
                    className="hidden"
                    type="file"
                    accept="audio/*"
                    onChange={async (event) => {
                        const inputElement = event.currentTarget;
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await onUploadFile(file);
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
                        {isUploading ? 'Đang upload audio...' : 'Upload audio cho cả part'}
                    </span>
                </Button>
            </label>
        </div>
    );
}

MCQPartAudioSection.displayName = `MCQPartAudioSection`;
