import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MCQModuleForm } from '@/features/placement-test/components/wizard/modules/MCQModuleForm';
import type { IModuleMCQ } from '@/features/placement-test/types';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { createDefaultExamModules } from '../../constants';
import { EXAM_TEST_STORAGE_KEYS } from '../../constants/storage-keys';
import { useCreateExamTest } from '../../hooks/useExamTestMutations';
import type { ICreateExamTestPayload, IExamModule } from '../../types';
import { WizardStepper, type WizardStep } from '../../components/wizard/WizardStepper';
import { Step1_BasicInfo } from '../../components/wizard/steps/Step1_BasicInfo';
import {
    toExamModulesFromPlacementMcq,
    toPlacementMcqModule,
} from '../../components/wizard/utils/toeic-mcq.mapper';

interface ToeicWizardDraft {
    step?: 1 | 2;
    step1?: Partial<ICreateExamTestPayload>;
    modules?: IExamModule[];
}

const WIZARD_STEPS: WizardStep[] = [
    { label: 'Thông tin', description: 'Thiết lập tên và ngôn ngữ bài thi TOEIC' },
    { label: 'Soạn đề', description: 'Chỉnh sửa câu hỏi TOEIC (7 part)' },
];

const DEFAULT_TOEIC_MODULES = createDefaultExamModules('toeic_lr');

const loadDraft = (): ToeicWizardDraft | null => {
    try {
        const raw = localStorage.getItem(EXAM_TEST_STORAGE_KEYS.TOEIC_WIZARD_DRAFT);
        return raw ? (JSON.parse(raw) as ToeicWizardDraft) : null;
    } catch {
        return null;
    }
};

const saveDraft = (draft: ToeicWizardDraft) => {
    try {
        localStorage.setItem(EXAM_TEST_STORAGE_KEYS.TOEIC_WIZARD_DRAFT, JSON.stringify(draft));
    } catch {
        // ignore storage errors
    }
};

const clearDraft = () => {
    localStorage.removeItem(EXAM_TEST_STORAGE_KEYS.TOEIC_WIZARD_DRAFT);
    localStorage.removeItem(EXAM_TEST_STORAGE_KEYS.TOEIC_WIZARD_MCQ_DRAFT);
};

const cloneModules = (modules: IExamModule[]): IExamModule[] => {
    return JSON.parse(JSON.stringify(modules)) as IExamModule[];
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

export default function ToeicTestWizardPage() {
    const navigate = useNavigate();
    const draft = loadDraft();
    const [currentStep, setCurrentStep] = useState<1 | 2>(draft?.step ?? 1);
    const [step1Data, setStep1Data] = useState<Partial<ICreateExamTestPayload>>(() => ({
        format: 'toeic_lr',
        ...(draft?.step1 ?? {}),
    }));
    const [modules, setModules] = useState<IExamModule[]>(() => (
        draft?.modules?.length ? cloneModules(draft.modules) : cloneModules(DEFAULT_TOEIC_MODULES)
    ));

    const { mutate: createTest } = useCreateExamTest();
    const placementMcqModule = useMemo(() => toPlacementMcqModule(modules), [modules]);

    useEffect(() => {
        saveDraft({
            step: currentStep,
            step1: step1Data,
            modules,
        });
    }, [currentStep, step1Data, modules]);

    const handleStep1Next = (data: Partial<ICreateExamTestPayload>) => {
        setStep1Data((prev) => ({
            ...prev,
            ...data,
            format: 'toeic_lr',
            name: data.name?.trim() || prev.name,
        }));
        setCurrentStep(2);
    };

    const handleCreate = (mcqModule: IModuleMCQ) => {
        const normalizedExamModules = toExamModulesFromPlacementMcq(mcqModule);
        setModules(normalizedExamModules);

        const payload = sanitizeExamPayload({
            ...(step1Data as ICreateExamTestPayload),
            modules: normalizedExamModules,
            format: 'toeic_lr' as const,
        });

        if (!payload.name || !payload.languageId || !payload.language) {
            toast.error('Thiếu thông tin bắt buộc để tạo đề TOEIC.');
            return;
        }

        const createPayload: ICreateExamTestPayload = {
            ...payload,
            name: payload.name,
            languageId: payload.languageId,
            language: payload.language,
            format: 'toeic_lr',
            modules: normalizedExamModules,
        };

        createTest(createPayload, {
            onSuccess: () => {
                clearDraft();
                toast.success('Đã tạo đề TOEIC mới');
                navigate('/exam-tests');
            },
        });
    };

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
            <PageHeader
                title="Tạo đề TOEIC L&R mới"
                description="Editor 7 part dùng đúng MCQModuleForm của Placement Test."
            >
                <Button variant="outline" onClick={() => navigate('/exam-tests')}>
                    Hủy
                </Button>
            </PageHeader>

            <WizardStepper steps={WIZARD_STEPS} currentStep={currentStep} />

            <div className="rounded-xl border bg-background p-6 shadow-sm">
                {currentStep === 1 && (
                    <Step1_BasicInfo
                        defaultValues={step1Data}
                        onDone={handleStep1Next}
                        presetFormat="toeic_lr"
                        hideFormatPicker
                    />
                )}

                {currentStep === 2 && (
                    <MCQModuleForm
                        defaultValues={placementMcqModule}
                        order={1}
                        onSave={handleCreate}
                        onCancel={() => setCurrentStep(1)}
                        draftKey={EXAM_TEST_STORAGE_KEYS.TOEIC_WIZARD_MCQ_DRAFT}
                    />
                )}
            </div>
        </div>
    );
}
