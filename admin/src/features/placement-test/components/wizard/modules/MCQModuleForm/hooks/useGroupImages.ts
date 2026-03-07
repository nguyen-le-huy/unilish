import { useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { UseFormReturn } from 'react-hook-form';
import type { MCQModuleFormValues } from '../schema';

// ─── useGroupImages ───────────────────────────────────────────────────────────
// Manages shared image state for grouped question clusters (Part 3/4/6/7).

export interface UseGroupImagesReturn {
    uploadingImageKey: string | null;
    getSharedImages: (partIndex: number, groupStart: number) => string[];
    setSharedImages: (partIndex: number, groupStart: number, imageUrls: string[], groupSize: number) => void;
    moveGroupImage: (partIndex: number, groupStart: number, fromIndex: number, toIndex: number, groupSize: number) => void;
    removeGroupImage: (partIndex: number, groupStart: number, imageIndex: number, groupSize: number) => void;
    uploadGroupImage: (partIndex: number, groupStart: number, file: File, groupSize: number, append: boolean) => Promise<void>;
}

export function useGroupImages(form: UseFormReturn<MCQModuleFormValues>): UseGroupImagesReturn {
    const [uploadingImageKey, setUploadingImageKey] = useState<string | null>(null);

    function getSharedImages(partIndex: number, groupStart: number): string[] {
        const fromUrls = form.getValues(`parts.${partIndex}.manualQuestions.${groupStart}.imageUrls`) ?? [];
        const filtered = fromUrls.filter((u) => !!u.trim());
        if (filtered.length > 0) return filtered;

        const fallback = form.getValues(`parts.${partIndex}.manualQuestions.${groupStart}.imageUrl`) ?? '';
        return fallback.trim() ? [fallback.trim()] : [];
    }

    function setSharedImages(
        partIndex: number,
        groupStart: number,
        imageUrls: string[],
        groupSize: number,
    ): void {
        const normalized = imageUrls.map((u) => u.trim()).filter(Boolean);
        const firstUrl = normalized[0] ?? '';

        for (let offset = 0; offset < groupSize; offset++) {
            const qi = groupStart + offset;
            if (!form.getValues(`parts.${partIndex}.manualQuestions.${qi}`)) break;

            form.setValue(`parts.${partIndex}.manualQuestions.${qi}.imageUrl`, firstUrl, {
                shouldDirty: true,
                shouldValidate: true,
            });
            form.setValue(`parts.${partIndex}.manualQuestions.${qi}.imageUrls`, normalized, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }

    function moveGroupImage(
        partIndex: number,
        groupStart: number,
        fromIndex: number,
        toIndex: number,
        groupSize: number,
    ): void {
        const images = getSharedImages(partIndex, groupStart);
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) return;

        const next = [...images];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return;
        next.splice(toIndex, 0, moved);
        setSharedImages(partIndex, groupStart, next, groupSize);
    }

    function removeGroupImage(
        partIndex: number,
        groupStart: number,
        imageIndex: number,
        groupSize: number,
    ): void {
        const next = getSharedImages(partIndex, groupStart).filter((_, i) => i !== imageIndex);
        setSharedImages(partIndex, groupStart, next, groupSize);
    }

    async function uploadGroupImage(
        partIndex: number,
        groupStart: number,
        file: File,
        groupSize: number,
        append: boolean,
    ): Promise<void> {
        const key = `${partIndex}-group-${groupStart}-image`;
        setUploadingImageKey(key);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'placement-tests/manual/question-items');
            const res = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload', formData);
            const url = res.data.data.url;

            if (append) {
                const current = getSharedImages(partIndex, groupStart);
                setSharedImages(partIndex, groupStart, [...current, url], groupSize);
            } else {
                setSharedImages(partIndex, groupStart, [url], groupSize);
            }
            toast.success(`Đã upload hình chung cho cụm ${groupSize} câu`);
        } catch {
            toast.error('Upload hình thất bại');
        } finally {
            setUploadingImageKey(null);
        }
    }

    return {
        uploadingImageKey,
        getSharedImages,
        setSharedImages,
        moveGroupImage,
        removeGroupImage,
        uploadGroupImage,
    };
}
