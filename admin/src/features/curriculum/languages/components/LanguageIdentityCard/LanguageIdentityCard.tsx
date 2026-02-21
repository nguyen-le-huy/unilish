import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUploadFlagIcon } from '../../hooks/useLanguageMutations';
import type { LanguageFormValues } from '../../hooks/useLanguageForm';
import { toLanguageCode } from '../../utils/language.utils';

interface LanguageIdentityCardProps {
    form: UseFormReturn<LanguageFormValues>;
    isCreateMode: boolean;
    className?: string;
}

export function LanguageIdentityCard({ form, isCreateMode, className }: LanguageIdentityCardProps) {
    const uploadFlagMutation = useUploadFlagIcon();
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');

    const flagFile = form.watch('_flagFile');
    const flagIconUrl = form.watch('flagIconUrl');

    // Generate object URL for local preview when a file is selected
    useEffect(() => {
        if (!flagFile) {
            setLocalPreviewUrl('');
            return;
        }
        const url = URL.createObjectURL(flagFile);
        setLocalPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [flagFile]);

    const previewImageUrl = localPreviewUrl || flagIconUrl;

    const handleFileChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0] ?? undefined;
            form.setValue('_flagFile', file);
        },
        [form],
    );

    const handleUpload = useCallback(async () => {
        if (!flagFile) return;
        const uploaded = await uploadFlagMutation.mutateAsync(flagFile);
        form.setValue('flagIconUrl', uploaded.url);
        form.setValue('_flagFile', undefined);
        setLocalPreviewUrl('');
    }, [flagFile, form, uploadFlagMutation]);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Thông tin định danh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="lang-name">Tên hiển thị</FormLabel>
                            <FormControl>
                                <Input id="lang-name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="nativeName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="lang-native-name">Tên bản ngữ</FormLabel>
                            <FormControl>
                                <Input id="lang-native-name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="lang-code">ISO Code</FormLabel>
                            <FormControl>
                                <Input
                                    id="lang-code"
                                    {...field}
                                    disabled={!isCreateMode}
                                    onChange={(e) => field.onChange(toLanguageCode(e.target.value))}
                                    aria-describedby="lang-code-hint"
                                />
                            </FormControl>
                            <p id="lang-code-hint" className="text-xs text-muted-foreground">
                                Format: "en" hoặc "en-US"
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Flag upload */}
                <div className="space-y-2">
                    <FormLabel htmlFor="lang-flag-file">Flag Icon (Cloudinary)</FormLabel>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            id="lang-flag-file"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            aria-label="Upload flag icon image"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleUpload}
                            disabled={!flagFile || uploadFlagMutation.isPending}
                            aria-label="Upload selected flag icon"
                        >
                            {uploadFlagMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4 mr-2" />
                            )}
                            Upload
                        </Button>
                    </div>

                    {previewImageUrl ? (
                        <div className="flex items-center gap-2 rounded-md border p-2 w-fit">
                            <img
                                src={previewImageUrl}
                                alt="Flag preview"
                                className="h-6 w-6 rounded-sm object-cover"
                            />
                            <span className="text-xs text-muted-foreground">Preview</span>
                        </div>
                    ) : null}
                </div>

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <FormLabel>Trạng thái hoạt động</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                    Chỉ ngôn ngữ Active mới hiển thị với học viên
                                </p>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    aria-label="Toggle language active status"
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}
