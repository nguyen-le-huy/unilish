import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
    label: string;
    description: string;
}

interface Props {
    steps: WizardStep[];
    currentStep: number;
}

export function WizardStepper({ steps, currentStep }: Props) {
    return (
        <ol className="flex items-start gap-0">
            {steps.map((step, idx) => {
                const stepNumber = idx + 1;
                const isCompleted = stepNumber < currentStep;
                const isCurrent = stepNumber === currentStep;

                return (
                    <li key={step.label} className="flex flex-1 items-center">
                        <div className="min-w-[5rem] flex flex-col items-center gap-1.5">
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                                    isCompleted
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : isCurrent
                                            ? 'border-primary bg-background text-primary'
                                            : 'border-muted-foreground/30 bg-background text-muted-foreground',
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
                                <p className="hidden text-[10px] text-muted-foreground sm:block">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                        {idx < steps.length - 1 && (
                            <div
                                className={cn(
                                    'mt-[-1.5rem] h-0.5 flex-1',
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
