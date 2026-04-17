import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MCQModuleForm } from '@/features/placement-test/components/wizard/modules/MCQModuleForm';
import type { IModuleMCQ } from '@/features/placement-test/types';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { createDefaultExamModules } from '../../constants';
import { useExamTest } from '../../hooks/useExamTest';
import {
    useCreateExamTest,
    useUpdateExamTest,
} from '../../hooks/useExamTestMutations';
import type {
    ExamFormat,
    ICreateExamTestPayload,
    IUpdateExamTestPayload,
} from '../../types';
import { Step1_BasicInfo } from './steps/Step1_BasicInfo';
import { Step2_Modules } from './steps/Step2_Modules';
import {
    toExamModulesFromPlacementMcq,
    toPlacementMcqModule,
} from './utils/toeic-mcq.mapper';

const STEPS = ['Thông tin', 'Cấu trúc'] as const;

interface Props {
    editId?: string;
    presetFormat?: ExamFormat;
}

const isExamFormat = (value: string | undefined): value is ExamFormat => {
    return value === 'toeic_lr' || value === 'ielts';
};

const canCreatePayload = (
    payload: Partial<ICreateExamTestPayload>,
): payload is ICreateExamTestPayload => {
    return (
        typeof payload.name === 'string'
        && payload.name.trim().length > 0
        && typeof payload.languageId === 'string'
        && payload.languageId.trim().length > 0
        && typeof payload.language === 'string'
        && payload.language.trim().length > 0
        && isExamFormat(payload.format)
    );
};

const sanitizeExamPayload = (
    payload: Partial<ICreateExamTestPayload>,
): Partial<ICreateExamTestPayload> => {
    if (!payload.settings) {
        return payload;
    }

    const { timeLimitOverrideMinutes, ...restSettings } = payload.settings;

    return {
        ...payload,
        settings: {
            ...restSettings,
            ...(typeof timeLimitOverrideMinutes === 'number'
                ? { timeLimitOverrideMinutes }
                : {}),
        },
    };
};

export function ExamTestWizard({ editId, presetFormat }: Props) {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<Partial<ICreateExamTestPayload>>(() => (
        presetFormat ? { format: presetFormat } : {}
    ));

    const { data: existingTest } = useExamTest(editId);
    const { mutate: create, isPending: isCreating } = useCreateExamTest();
    const { mutate: update, isPending: isUpdating } = useUpdateExamTest();

    const isPending = isCreating || isUpdating;

    const saveStep = (data: Partial<ICreateExamTestPayload>) => {
        setFormData((prev) => ({ ...prev, ...data }));
        setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    };

    const baseData = useMemo<Partial<ICreateExamTestPayload>>(
        () => (existingTest
            ? {
                name: existingTest.name,
                format: existingTest.format,
                languageId: existingTest.languageId,
                language: existingTest.language,
                description: existingTest.description,
                modules: existingTest.modules,
                scoringConfig: existingTest.scoringConfig,
                settings: existingTest.settings,
            }
            : {}),
        [existingTest],
    );

    const currentData = useMemo(
        () => ({
            ...baseData,
            ...formData,
            ...(presetFormat ? { format: presetFormat } : {}),
        }),
        [baseData, formData, presetFormat],
    );

    const isToeicFormat = currentData.format === 'toeic_lr';
    const toeicMcqDefaultValues = useMemo(() => {
        if (!isToeicFormat) {
            return null;
        }

        const modules = currentData.modules?.length
            ? currentData.modules
            : createDefaultExamModules('toeic_lr');
        return toPlacementMcqModule(modules);
    }, [isToeicFormat, currentData.modules]);

    const handleFinish = (data: Partial<ICreateExamTestPayload>) => {
        const mergedPayload = sanitizeExamPayload({
            ...currentData,
            ...data,
        });

        if (!canCreatePayload(mergedPayload)) {
            toast.error('Thiếu dữ liệu bắt buộc. Vui lòng kiểm tra lại các bước trước.');
            return;
        }

        if (editId) {
            const { format: omittedFormat, ...updatePayload } = mergedPayload;
            void omittedFormat;

            update(
                { id: editId, payload: updatePayload as IUpdateExamTestPayload },
                {
                    onSuccess: () => {
                        navigate('/exam-tests');
                    },
                },
            );
            return;
        }

        create(mergedPayload, {
            onSuccess: () => {
                navigate('/exam-tests');
            },
        });
    };

    const handleToeicModulesSave = (module: IModuleMCQ) => {
        handleFinish({ modules: toExamModulesFromPlacementMcq(module) });
    };

    if (editId && !existingTest) {
        return (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Đang tải dữ liệu bài thi...
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-xl border bg-background p-6">
            <div className="flex items-center gap-2">
                {STEPS.map((label, index) => (
                    <div key={label} className="flex flex-1 items-center gap-2">
                        <div
                            className={cn(
                                'flex items-center gap-2 text-sm font-medium',
                                index === step ? 'text-primary' : 'text-muted-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                                    index === step
                                        ? 'bg-primary text-primary-foreground'
                                        : index < step
                                            ? 'bg-muted text-foreground'
                                            : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {index + 1}
                            </span>
                            {label}
                        </div>
                        {index < STEPS.length - 1 && <Separator className="flex-1" />}
                    </div>
                ))}
            </div>

            {step === 0 && (
                <Step1_BasicInfo
                    defaultValues={currentData}
                    onDone={saveStep}
                    presetFormat={presetFormat}
                />
            )}
            {step === 1 && (
                isToeicFormat && toeicMcqDefaultValues
                    ? (
                        <MCQModuleForm
                            defaultValues={toeicMcqDefaultValues}
                            order={1}
                            onSave={handleToeicModulesSave}
                            onCancel={() => setStep(0)}
                            draftKey={`exam-test:wizard:toeic-mcq:${editId ?? 'new'}`}
                        />
                    )
                    : (
                        <Step2_Modules
                            defaultValues={currentData}
                            onDone={handleFinish}
                            onBack={() => setStep(0)}
                            isSubmitting={isPending}
                            nextLabel={editId ? 'Lưu cập nhật' : 'Tạo đề'}
                        />
                    )
            )}
        </div>
    );
}
