import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import type { ICreateQuestionPayload } from '../../../types';

export function StemField() {
    const { control, watch, setValue } = useFormContext<ICreateQuestionPayload>();
    const [uploadingType, setUploadingType] = useState<'image' | 'audio' | 'video' | null>(null);

    const skill = watch('skill');

    async function handleUpload(file: File, target: 'imageUrl' | 'audioUrl') {
        setUploadingType(target === 'imageUrl' ? 'image' : 'audio');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'question-bank/manual');

            const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload', formData);
            setValue(`stem.${target}`, response.data.data.url, { shouldDirty: true, shouldValidate: true });
            toast.success('Upload file thành công');
        } catch {
            toast.error('Upload file thất bại');
        } finally {
            setUploadingType(null);
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Câu hỏi (Stem)</h3>

            <FormField
                control={control}
                name="stem.text"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nội dung text</FormLabel>
                        <FormControl>
                            <Textarea
                                {...field}
                                placeholder="Nhập nội dung câu hỏi..."
                                rows={3}
                                className="resize-none"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="stem.audioUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>URL âm thanh (tuỳ chọn)</FormLabel>
                        <div className="space-y-2">
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="https://cdn.example.com/audio.mp3"
                                    type="url"
                                />
                            </FormControl>
                            <label className="inline-flex">
                                <input
                                    className="hidden"
                                    type="file"
                                    accept="audio/*"
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        await handleUpload(file, 'audioUrl');
                                        event.currentTarget.value = '';
                                    }}
                                />
                                <Button type="button" variant="outline" size="sm" asChild>
                                    <span>{uploadingType === 'audio' ? 'Đang upload...' : 'Upload audio'}</span>
                                </Button>
                            </label>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="stem.imageUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>URL hình ảnh (tuỳ chọn)</FormLabel>
                        <div className="space-y-2">
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="https://cdn.example.com/image.png"
                                    type="url"
                                />
                            </FormControl>
                            <label className="inline-flex">
                                <input
                                    className="hidden"
                                    type="file"
                                    accept="image/*"
                                    onChange={async (event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        await handleUpload(file, 'imageUrl');
                                        event.currentTarget.value = '';
                                    }}
                                />
                                <Button type="button" variant="outline" size="sm" asChild>
                                    <span>{uploadingType === 'image' ? 'Đang upload...' : 'Upload ảnh'}</span>
                                </Button>
                            </label>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {skill === 'listening' && (
                <FormField
                    control={control}
                    name="content.transcript"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transcript (Listening)</FormLabel>
                            <FormControl>
                                <Textarea
                                    value={typeof field.value === 'string' ? field.value : ''}
                                    onChange={(event) => field.onChange(event.target.value)}
                                    placeholder="Nhập transcript để phục vụ accessibility và AI review..."
                                    rows={4}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}
