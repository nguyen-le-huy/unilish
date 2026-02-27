import { useCallback, useState } from 'react';
import { useFormContext, Controller, useFieldArray } from 'react-hook-form';
import { Ear, Languages, Tag, Check, CircleX, AlertCircle } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import type { SpeakingLessonFormValues } from '../../types/speaking.types';

export const AzureConfigEditor = () => {
    const { control, watch, setValue, formState: { errors } } = useFormContext<SpeakingLessonFormValues>();

    const referenceText = watch('gradingConfig.referenceText');
    const isFreeTalk = referenceText === null;

    const { fields: keywordMaps, remove: removeKeywordMap, append: appendKeywordMap } = useFieldArray({
        control,
        name: 'gradingConfig.keywordConceptMap',
    });

    const [tagInput, setTagInput] = useState('');
    const requiredKeywords = watch('gradingConfig.requiredKeywords') || [];

    const handleFreeTalkToggle = (checked: boolean) => {
        setValue('gradingConfig.referenceText', checked ? null : '', { shouldDirty: true });
    };

    const addTag = useCallback((tag: string) => {
        const cleanTag = tag.trim().toLowerCase();
        if (!cleanTag || requiredKeywords.includes(cleanTag)) return;

        const newTags = [...requiredKeywords, cleanTag];
        setValue('gradingConfig.requiredKeywords', newTags, { shouldDirty: true });

        // Auto append mapping entry
        appendKeywordMap({
            word: cleanTag,
            conceptId: '',
        });
        setTagInput('');
    }, [requiredKeywords, setValue, appendKeywordMap]);

    const removeTag = useCallback((tagToRemove: string) => {
        // Remove from keywords array
        const newTags = requiredKeywords.filter(tag => tag !== tagToRemove);
        setValue('gradingConfig.requiredKeywords', newTags, { shouldDirty: true });

        // Remove from mapping array
        const mapIndex = keywordMaps.findIndex(m => m.word === tagToRemove);
        if (mapIndex !== -1) {
            removeKeywordMap(mapIndex);
        }
    }, [requiredKeywords, keywordMaps, setValue, removeKeywordMap]);

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-20">
            <Card className="shadow-sm border-blue-100">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                            <Ear className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Đôi tai chấm điểm (Azure AI)</CardTitle>
                            <CardDescription>Cấu hình đánh giá phát âm và tracking Concept</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col gap-6 md:flex-row md:justify-between p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center space-x-3">
                            <Controller
                                control={control}
                                name="gradingConfig.referenceText"
                                render={() => (
                                    <Switch
                                        id="freetalk-mode"
                                        checked={isFreeTalk}
                                        onCheckedChange={handleFreeTalkToggle}
                                    />
                                )}
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="freetalk-mode" className="text-sm font-medium">Chế độ Free Talk (Unscripted)</Label>
                                <p className="text-xs text-muted-foreground w-64">
                                    Azure sẽ chấm điểm mà không cần kịch bản mẫu. Tính được độ lưu loát và ngữ điệu tự do.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <Controller
                                control={control}
                                name="gradingConfig.enableProsodyAssessment"
                                render={({ field }) => (
                                    <Switch
                                        id="prosody-mode"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <div className="space-y-0.5">
                                <Label htmlFor="prosody-mode" className="text-sm font-medium">Chấm Ngữ điệu (Prosody)</Label>
                                <p className="text-xs text-muted-foreground w-64">
                                    Phát hiện User nói giống robot hay có trọng âm lên xuống tự nhiên.
                                </p>
                            </div>
                        </div>
                    </div>

                    {!isFreeTalk && (
                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                            <Label className="text-sm font-medium">Văn bản Mẫu (Reference Text)</Label>
                            <Controller
                                control={control}
                                name="gradingConfig.referenceText"
                                render={({ field }) => (
                                    <Textarea
                                        {...field}
                                        value={field.value || ''}
                                        placeholder="Nhập đoạn hội thoại mẫu để Azure đối chiếu sửa lỗi chính xác..."
                                        rows={4}
                                        className={errors.gradingConfig?.referenceText ? 'border-destructive' : ''}
                                    />
                                )}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Hệ thống điểm</Label>
                            <Controller
                                control={control}
                                name="gradingConfig.gradingSystem"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="FivePoint">Thang 5 điểm</SelectItem>
                                            <SelectItem value="HundredMark">Thang 100 điểm</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Độ chi tiết lỗi (Granularity)</Label>
                            <Controller
                                control={control}
                                name="gradingConfig.granularity"
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Phoneme">Từng âm vị (Phoneme) - Khuyên dùng</SelectItem>
                                            <SelectItem value="Syllable">Từng âm tiết (Syllable)</SelectItem>
                                            <SelectItem value="Word">Cấp độ từ (Word)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Languages className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle className="text-lg">Target Vocabulary Tracking</CardTitle>
                            <CardDescription>
                                Theo dõi và mapping Concept ID để cảnh báo hệ thống khi học viên sai.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Từ khóa cần Tracking (Gõ và ấn Enter)</Label>
                        <div className="flex flex-wrap gap-2 p-3 min-h-[50px] border rounded-md focus-within:ring-1 focus-within:ring-ring focus-within:border-primary">
                            {requiredKeywords.map((tag) => (
                                <span key={tag} className="flex items-center gap-1 bg-slate-100 border text-slate-700 px-2 py-1 rounded text-sm group">
                                    <Tag className="h-3 w-3 text-slate-400" />
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-1 text-slate-400 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <CircleX className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
                                placeholder={requiredKeywords.length === 0 ? "Ví dụ: luggage, flight..." : ""}
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag(tagInput);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {keywordMaps.length > 0 && (
                        <div className="rounded-md border animate-in fade-in duration-300">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                                        <th className="px-4 py-3 font-medium w-1/3">Từ khóa (Target Word)</th>
                                        <th className="px-4 py-3 font-medium">Ánh xạ Concept ID (Lấy từ Graph)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {keywordMaps.map((field, index) => (
                                        <tr key={field.id} className="border-b last:border-0 group">
                                            <td className="px-4 py-3 align-middle font-mono font-medium text-slate-700 bg-slate-50/50">
                                                {field.word}
                                            </td>
                                            <td className="p-2 align-middle">
                                                <Controller
                                                    control={control}
                                                    name={`gradingConfig.keywordConceptMap.${index}.conceptId` as const}
                                                    render={({ field: inputField, fieldState }) => (
                                                        <div className="relative">
                                                            <Input
                                                                {...inputField}
                                                                placeholder="Nhập/Chọn Concept ID..."
                                                                className={`h-9 pr-8 ${fieldState.error ? 'border-destructive' : ''}`}
                                                            />
                                                            {inputField.value && !fieldState.error && (
                                                                <Check className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
                                                            )}
                                                            {fieldState.error && (
                                                                <AlertCircle className="absolute right-2 top-2.5 h-4 w-4 text-destructive" />
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {errors.gradingConfig?.keywordConceptMap && (
                        <p className="text-sm text-destructive font-medium">
                            {errors.gradingConfig.keywordConceptMap.message || 'Vui lòng kiểm tra lại mapping ID bảng trên.'}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
