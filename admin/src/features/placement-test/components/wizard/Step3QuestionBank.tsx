import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { usePoolValidation } from '../../hooks/usePlacementTestQueries';
import { POOL_BUFFER_MULTIPLIER } from '../../constants';
import type { IPlacementTestModule, IModuleMCQ } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const POOL_BUFFER_MULTIPLIER_VALUE = POOL_BUFFER_MULTIPLIER ?? 2;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    testId?: string;
    languageId?: string;
    modules: IPlacementTestModule[];
    onNext: () => void;
    onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step3QuestionBank({ testId, languageId, modules, onNext, onBack }: Props) {
    const navigate = useNavigate();

    const getSkillByPart = (part: number) => {
        if (part >= 1 && part <= 4) return 'listening';
        if (part >= 5 && part <= 7) return 'reading';
        return 'grammar';
    };

    const goToQuestionEditor = (part: number) => {
        const params = new URLSearchParams({
            source: 'placement_test',
            skill: getSkillByPart(part),
            part: String(part),
        });

        if (languageId) {
            params.set('languageId', languageId);
        }

        navigate(`/questions/new?${params.toString()}`);
    };

    const { data: validation, isLoading, refetch, isFetching } = usePoolValidation({
        testId: testId ?? '',
        enabled: !!testId,
    });

    // For new tests without an ID yet, show a summary of what will be needed
    if (!testId) {
        return (
            <div className="space-y-5">
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Lưu nháp để xác thực pool</AlertTitle>
                    <AlertDescription>
                        Bài kiểm tra chưa được lưu. Hoàn thành bước này sau khi tạo bài kiểm tra nháp.
                    </AlertDescription>
                </Alert>

                {/* Show pool requirements */}
                <div className="space-y-3">
                    <p className="text-sm font-medium">Yêu cầu pool câu hỏi (ước tính):</p>
                    {modules.filter((m) => m.type === 'mcq').map((m, idx) => {
                        const mcq = m as IModuleMCQ;
                        return mcq.parts?.map((part) => (
                            <div key={`${idx}-${part.part}`} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                                <div>
                                    <span className="font-medium">{m.name} — {part.name}</span>
                                    <Badge variant="outline" className="ml-2 font-mono text-xs">{part.poolTag}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                        Cần ≥ {part.questionsCount * POOL_BUFFER_MULTIPLIER_VALUE} câu
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => goToQuestionEditor(part.part)}
                                    >
                                        + Thêm vào pool
                                    </Button>
                                </div>
                            </div>
                        ));
                    })}
                </div>

                <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={onBack}>← Quay lại</Button>
                    <Button onClick={onNext}>Tiếp theo →</Button>
                </div>
            </div>
        );
    }

    const allValid = validation?.isValid ?? false;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Kết quả kiểm tra pool câu hỏi</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
                    <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    Làm mới
                </Button>
            </div>

            {/* Overall status */}
            {!isLoading && validation && (
                <Alert variant={allValid ? 'default' : 'destructive'}>
                    {allValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                        <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                        {allValid ? 'Pool hợp lệ — sẵn sàng kích hoạt' : 'Pool chưa đủ câu hỏi'}
                    </AlertTitle>
                    <AlertDescription>
                        {allValid
                            ? 'Tất cả parts có đủ câu hỏi trong ngân hàng.'
                            : 'Một số parts chưa đủ số lượng câu hỏi cần thiết. Vui lòng bổ sung vào ngân hàng câu hỏi.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Per-module breakdown */}
            <div className="space-y-4">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))
                    : validation?.modules.map((mod) => (
                        <div key={`${mod.moduleIndex}-${mod.moduleName}`} className="rounded-lg border overflow-hidden">
                            <div className="flex items-center gap-2 bg-muted/30 px-4 py-2">
                                <span className="text-sm font-medium">{mod.moduleName}</span>
                                <Badge variant="outline" className="text-xs">{mod.type.toUpperCase()}</Badge>
                            </div>
                            {mod.type === 'mcq' && mod.parts ? (
                                <div className="divide-y">
                                    {mod.parts.map((part) => {
                                        const pct = Math.min(100, Math.round((part.publishedCount / part.minimumPool) * 100));
                                        return (
                                            <div key={part.part} className="px-4 py-3 space-y-1.5">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        {part.isValid
                                                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                            : <XCircle className="h-3.5 w-3.5 text-destructive" />
                                                        }
                                                        <span>{part.name}</span>
                                                        <Badge variant="outline" className="font-mono text-[10px] h-4">{part.poolTag}</Badge>
                                                    </div>
                                                    <span className={part.isValid ? 'text-green-700 font-medium' : 'text-destructive font-medium'}>
                                                        {part.publishedCount} / {part.minimumPool}
                                                    </span>
                                                </div>
                                                <Progress value={pct} className="h-1.5" />
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {part.required} × {POOL_BUFFER_MULTIPLIER_VALUE} = {part.minimumPool} câu tối thiểu
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 px-2 text-[10px]"
                                                        onClick={() => goToQuestionEditor(part.part)}
                                                    >
                                                        + Thêm câu hỏi
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="px-4 py-3 text-sm text-muted-foreground">
                                    Module này không cần pool câu hỏi.
                                </div>
                            )}
                        </div>
                    ))
                }
            </div>

            <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={onBack}>← Quay lại</Button>
                <Button onClick={onNext}>Tiếp theo →</Button>
            </div>
        </div>
    );
}
