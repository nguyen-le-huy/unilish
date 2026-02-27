import { useFormContext } from 'react-hook-form';
import { Bot, Sparkles } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { notification } from '@/lib/notification';

import type { SpeakingLessonFormValues } from '../../types/speaking.types';

export const OpenAIConfigEditor = () => {
    const { register, formState: { errors } } = useFormContext<SpeakingLessonFormValues>();

    const handleOptimizePrompt = () => {
        notification.info('Tính năng Tối ưu System Prompt bằng AI sẽ được mở sau.');
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-20">
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                            <Bot className="h-4 w-4" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Persona (Vai diễn AI)</CardTitle>
                            <CardDescription>Thiết lập danh tính nhân vật AI</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="roleName" className="text-sm font-medium">
                            Tên Nhân Vật
                        </Label>
                        <Input
                            id="roleName"
                            placeholder="Ví dụ: Officer John"
                            {...register('aiConfig.roleName')}
                            className={errors.aiConfig?.roleName ? 'border-destructive' : ''}
                        />
                        {errors.aiConfig?.roleName && (
                            <p className="text-xs text-destructive">{errors.aiConfig.roleName.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-indigo-100">
                <CardHeader>
                    <CardTitle className="text-lg">Prompting (Chỉ thị Hội thoại)</CardTitle>
                    <CardDescription>
                        Cấu hình Realtime Conversation Context
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="firstMessage" className="text-sm font-medium">
                            Lời Chào Đầu Tiên (First Message)
                        </Label>
                        <Input
                            id="firstMessage"
                            placeholder="Ví dụ: Hello! How can I help you today?"
                            {...register('aiConfig.firstMessage')}
                            className={errors.aiConfig?.firstMessage ? 'border-destructive' : ''}
                        />
                        <p className="text-xs text-muted-foreground">
                            Câu nói để kích hoạt luồng kết nối WebSocket khi User ấn Start Call.
                        </p>
                        {errors.aiConfig?.firstMessage && (
                            <p className="text-xs text-destructive">{errors.aiConfig.firstMessage.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="systemInstruction" className="text-sm font-medium">
                                Chỉ Thị Hệ Thống (System Instruction)
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleOptimizePrompt}
                                className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                            >
                                <Sparkles className="h-3 w-3" />
                                Optimize Prompt
                            </Button>
                        </div>
                        <Textarea
                            id="systemInstruction"
                            placeholder="Mô tả hành vi của AI. Ví dụ: You are a friendly airport officer..."
                            rows={8}
                            {...register('aiConfig.systemInstruction')}
                            className={`font-mono text-sm ${errors.aiConfig?.systemInstruction ? 'border-destructive' : ''}`}
                        />
                        {errors.aiConfig?.systemInstruction && (
                            <p className="text-xs text-destructive">{errors.aiConfig.systemInstruction.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
