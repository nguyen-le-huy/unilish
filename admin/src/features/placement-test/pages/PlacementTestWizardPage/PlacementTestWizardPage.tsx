import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { WizardStepper, type WizardStep } from '../../components/wizard/WizardStepper';
import { Step1GeneralInfo } from '../../components/wizard/Step1GeneralInfo';
import { Step2Structure } from '../../components/wizard/Step2Structure';
import { usePlacementTest } from '../../hooks/usePlacementTest';
import {
    useCreatePlacementTest,
    useUpdatePlacementTest,
} from '../../hooks/usePlacementTestMutations';
import type { WizardFormState } from '../../types/wizard.types';
import type {
    ICreatePlacementTestPayload,
    IPlacementTestModule,
    ICEFRMapping,
    IPlacementTest,
} from '../../types';
import { STORAGE_KEYS } from '../../constants/storage-keys';

// ─── Constants ────────────────────────────────────────────────────────────────

const WIZARD_STEPS: WizardStep[] = [
    { label: 'Ngôn ngữ', description: 'Chọn ngôn ngữ đề thi' },
    { label: 'Soạn đề', description: 'Chỉnh sửa cấu trúc mặc định' },
];

const DEFAULT_CEFR_MAPPING: ICEFRMapping = {
    weights: { mcq: 1, writing: 0, speaking: 0 },
    thresholds: [
        { level: 'A1', mcqMin: 0, mcqMax: 0.25, writingMin: 0, writingMax: 0.25, speakingMin: 0, speakingMax: 0.25 },
        { level: 'A2', mcqMin: 0.25, mcqMax: 0.45, writingMin: 0.25, writingMax: 0.45, speakingMin: 0.25, speakingMax: 0.45 },
        { level: 'B1', mcqMin: 0.45, mcqMax: 0.60, writingMin: 0.45, writingMax: 0.60, speakingMin: 0.45, speakingMax: 0.60 },
        { level: 'B2', mcqMin: 0.60, mcqMax: 0.75, writingMin: 0.60, writingMax: 0.75, speakingMin: 0.60, speakingMax: 0.75 },
        { level: 'C1', mcqMin: 0.75, mcqMax: 0.90, writingMin: 0.75, writingMax: 0.90, speakingMin: 0.75, speakingMax: 0.90 },
        { level: 'C2', mcqMin: 0.90, mcqMax: 1, writingMin: 0.90, writingMax: 1, speakingMin: 0.90, speakingMax: 1 },
    ],
};

const normalizeModulesForApi = (modules: IPlacementTestModule[]): IPlacementTestModule[] => {
    return modules
        .filter((module) => module.type === 'mcq')
        .map((module, index) => ({ ...module, order: index + 1 }));
};

const DEFAULT_TEST_MODULES: IPlacementTestModule[] = [
    {
        order: 1,
        type: 'mcq',
        name: 'TOEIC Listening + Reading',
        timeLimitMinutes: 45,
        showCountdown: true,
        allowBackNavigation: false,
        adaptive: true,
        samplingMode: 'random',
        parts: [
            { part: 1, name: 'Part 1 — Photographs', questionsCount: 3, poolTag: 'toeic-listening-part1', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
            { part: 2, name: 'Part 2 — Question-Response', questionsCount: 13, poolTag: 'toeic-listening-part2', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
            { part: 3, name: 'Part 3 — Short Conversations', questionsCount: 21, poolTag: 'toeic-listening-part3', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
            { part: 4, name: 'Part 4 — Short Talks', questionsCount: 15, poolTag: 'toeic-listening-part4', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
            { part: 5, name: 'Part 5 — Incomplete Sentences', questionsCount: 15, poolTag: 'toeic-reading-part5', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
            { part: 6, name: 'Part 6 — Text Completion', questionsCount: 8, poolTag: 'toeic-reading-part6', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
            { part: 7, name: 'Part 7 — Reading Comprehension', questionsCount: 27, poolTag: 'toeic-reading-part7', difficultyDistribution: {}, excludeRecentDays: 30, topicFilter: [] },
        ],
    },
];

const keepToeicModules = (modules: IPlacementTestModule[] | undefined): IPlacementTestModule[] =>
    (modules ?? []).filter((module) => module.type === 'mcq');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadDraft(): Partial<WizardFormState> | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.WIZARD_DRAFT);
        return raw ? (JSON.parse(raw) as Partial<WizardFormState>) : null;
    } catch {
        return null;
    }
}

function saveDraft(state: Partial<WizardFormState>) {
    try {
        localStorage.setItem(STORAGE_KEYS.WIZARD_DRAFT, JSON.stringify(state));
    } catch {
        // silently ignore storage errors
    }
}

function clearDraft() {
    localStorage.removeItem(STORAGE_KEYS.WIZARD_DRAFT);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlacementTestWizardPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    // ── Remote data (edit mode) ────────────────────────────────────────────────
    const { data: existingTest } = usePlacementTest(id);

    // ── Wizard state ──────────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState<1 | 2>(() => {
        if (id) return 1; // edit mode always starts at step 1
        return (loadDraft()?.step as 1 | 2) ?? 1;
    });
    const [step1Data, setStep1Data] = useState<Partial<ICreatePlacementTestPayload>>(() => {
        if (id) return {}; // will be populated from existingTest once loaded
        return loadDraft()?.step1 ?? {};
    });
    const [modules, setModules] = useState<IPlacementTestModule[]>(() => {
        if (id) return DEFAULT_TEST_MODULES; // will be populated from existingTest
        const draft = loadDraft();
        const draftModules = keepToeicModules(draft?.step2?.modules);
        return draftModules.length ? draftModules : DEFAULT_TEST_MODULES;
    });
    const [cefrMapping, setCefrMapping] = useState<ICEFRMapping>(DEFAULT_CEFR_MAPPING);

    // ── Sync from remote data once loaded (edit mode) ─────────────────────────
    useEffect(() => {
        if (!isEditMode || !existingTest) return;
        setStep1Data({
            language: existingTest.language,
            languageId: existingTest.languageId,
            name: existingTest.name,
            standard: existingTest.standard,
            outputFramework: existingTest.outputFramework,
            description: existingTest.description,
            settings: existingTest.settings,
        });
        const toeicModules = keepToeicModules(existingTest.modules);
        setModules(toeicModules.length ? toeicModules : DEFAULT_TEST_MODULES);
        setCefrMapping(DEFAULT_CEFR_MAPPING);
    // existingTest is the only reactive dep — id cannot change after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingTest]);

    // ── Persist draft ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditMode) {
            saveDraft({ step: currentStep, step1: step1Data, step2: { modules }, isDirty: true, step3: { topicsEdited: false }, step4: { cefrMappingEdited: false } });
        }
    }, [currentStep, step1Data, modules, isEditMode]);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const { mutate: createTest, isPending: isCreating } = useCreatePlacementTest();
    const { mutate: updateTest, isPending: isUpdating } = useUpdatePlacementTest();

    // ── Step handlers ─────────────────────────────────────────────────────────

    const handleStep1Next = useCallback((data: Partial<ICreatePlacementTestPayload>) => {
        const normalizedLanguage = data.language?.trim().toLowerCase() ?? '';
        const generatedName = `Placement Test ${normalizedLanguage.toUpperCase()} ${new Date().toISOString().slice(0, 10)}`;

        setStep1Data({
            language: normalizedLanguage,
            languageId: data.languageId ?? '',
            name: step1Data.name?.trim() || data.name?.trim() || generatedName,
            standard: 'Hybrid',
            outputFramework: 'CEFR',
            description: data.description,
            settings: step1Data.settings ?? data.settings ?? {
                targetAudience: ['new_user'],
                allowRetake: false,
                retakeCooldownDays: 90,
            },
        });
        setCurrentStep(2);
    }, [step1Data.name, step1Data.settings]);

    const handleFinalSubmit = useCallback((modulePayload: IPlacementTestModule[]) => {
        const normalizedModules = normalizeModulesForApi(modulePayload);
        setModules(normalizedModules);

        const payload: ICreatePlacementTestPayload = {
            ...(step1Data as ICreatePlacementTestPayload),
            modules: normalizedModules,
            cefrMapping,
        };

        if (isEditMode && id) {
            updateTest(
                { id, payload: { modules: normalizedModules, cefrMapping, ...step1Data } },
                {
                    onSuccess: () => {
                        clearDraft();
                        toast.success('Đã cập nhật bài kiểm tra');
                        navigate('/placement-tests');
                    },
                },
            );
        } else {
            createTest(payload, {
                onSuccess: (created: IPlacementTest) => {
                    clearDraft();
                    toast.success(`Đã tạo bài kiểm tra: ${created.name}`);
                    navigate('/placement-tests');
                },
            });
        }
    }, [step1Data, cefrMapping, isEditMode, id, updateTest, createTest, navigate]);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
            <PageHeader
                title={isEditMode ? 'Chỉnh sửa bài kiểm tra' : 'Tạo bài kiểm tra mới'}
                description="Chọn ngôn ngữ, sau đó soạn đề TOEIC Listening + Reading."
            >
                <Button variant="outline" onClick={() => navigate('/placement-tests')}>
                    Hủy
                </Button>
            </PageHeader>

            {/* Stepper */}
            <WizardStepper steps={WIZARD_STEPS} currentStep={currentStep} />

            {/* Step content */}
            <div className="rounded-xl border bg-background p-6 shadow-sm">
                {currentStep === 1 && (
                    <Step1GeneralInfo
                        defaultValues={step1Data}
                        onNext={handleStep1Next}
                    />
                )}
                {currentStep === 2 && (
                    <Step2Structure
                        defaultModules={modules}
                        onNext={handleFinalSubmit}
                        onBack={() => setCurrentStep(1)}
                        nextLabel={isEditMode ? 'Lưu cập nhật' : 'Tạo đề'}
                        isSubmitting={isCreating || isUpdating}
                    />
                )}
            </div>
        </div>
    );
}
