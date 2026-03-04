import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardStep {
    label: string;
    description: string;
}

interface Props {
    steps: WizardStep[];
    currentStep: number; // 1-indexed
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStepper({ steps, currentStep }: Props) {
    return (
        <ol className="flex items-start gap-0">
            {steps.map((step, idx) => {
                const stepNumber = idx + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                return (
                    <li key={step.label} className="flex flex-1 items-center">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center gap-1.5 min-w-[5rem]">
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                                    isCompleted
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : isCurrent
                                            ? 'border-primary text-primary bg-background'
                                            : 'border-muted-foreground/30 text-muted-foreground bg-background',
                                )}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                            </div>
                            <div className="text-center">
                                <p
                                    className={cn(
                                        'text-xs font-medium',
                                        isCurrent ? 'text-foreground' : 'text-muted-foreground',
                                    )}
                                >
                                    {step.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground hidden sm:block">
                                    {step.description}
                                </p>
                            </div>
                        </div>

                        {/* Connector line (skip for last) */}
                        {idx < steps.length - 1 && (
                            <div
                                className={cn(
                                    'h-0.5 flex-1 mt-[-1.5rem]',
                                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20',
                                )}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
