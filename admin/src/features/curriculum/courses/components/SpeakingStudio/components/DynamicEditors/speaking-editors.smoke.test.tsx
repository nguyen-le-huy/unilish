import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { AzureConfigEditor } from './AzureConfigEditor';
import { MissionEditor } from './MissionEditor';
import { OpenAIConfigEditor } from './OpenAIConfigEditor';
import type { SpeakingLessonFormValues } from '../../types/speaking.types';

const DEFAULT_FORM_VALUES: SpeakingLessonFormValues = {
    missionTitle: '',
    missionDescription: '',
    aiConfig: {
        roleName: '',
        firstMessage: '',
        systemInstruction: '',
    },
    gradingConfig: {
        referenceText: null,
        gradingSystem: 'FivePoint',
        granularity: 'Phoneme',
        enableProsodyAssessment: true,
        requiredKeywords: [],
        keywordConceptMap: [],
    },
    hints: [],
};

interface TestFormProviderProps {
    children: ReactNode;
}

const TestFormProvider = ({ children }: TestFormProviderProps) => {
    const methods = useForm<SpeakingLessonFormValues>({
        defaultValues: DEFAULT_FORM_VALUES,
        mode: 'onChange',
    });

    return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('Speaking dynamic editors smoke', () => {
    it('renders MissionEditor', () => {
        render(
            <TestFormProvider>
                <MissionEditor />
            </TestFormProvider>,
        );

        expect(screen.getByText('Chi tiết Nhiệm vụ')).toBeInTheDocument();
    });

    it('renders OpenAIConfigEditor', () => {
        render(
            <TestFormProvider>
                <OpenAIConfigEditor />
            </TestFormProvider>,
        );

        expect(screen.getByText('Persona (Vai diễn AI)')).toBeInTheDocument();
    });

    it('renders AzureConfigEditor', () => {
        render(
            <TestFormProvider>
                <AzureConfigEditor />
            </TestFormProvider>,
        );

        expect(screen.getByText('Đôi tai chấm điểm (Azure AI)')).toBeInTheDocument();
    });
});
