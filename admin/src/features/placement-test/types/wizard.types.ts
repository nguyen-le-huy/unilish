import type { ICreatePlacementTestPayload, IPlacementTestModule } from './index';

// ─── Wizard State (Frontend-only) ────────────────────────────────────────────

export type WizardStep = 1 | 2;

export interface WizardFormState {
    step: WizardStep;
    isDirty: boolean;
    step1: Partial<ICreatePlacementTestPayload>;
    step2: { modules: IPlacementTestModule[] };
    step3: { topicsEdited: boolean };
    step4: { cefrMappingEdited: boolean };
}
