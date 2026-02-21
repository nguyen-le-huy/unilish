import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { SkillWeights } from '../../types/learning-goal.types';
import { SKILL_PRESETS, SKILLS } from '../../constants/skill.constants';

interface SkillWeightEditorProps {
    skillWeights: SkillWeights;
    onChange: (next: SkillWeights) => void;
}

type SkillKey = keyof SkillWeights;

const clamp = (value: number): number => {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
};

export function SkillWeightEditor({ skillWeights, onChange }: SkillWeightEditorProps) {
    const total = useMemo(() => Object.values(skillWeights).reduce((sum, value) => sum + value, 0), [skillWeights]);

    const handleInputChange = (key: SkillKey, valuePercent: number) => {
        const normalized = clamp(valuePercent / 100);
        onChange({
            ...skillWeights,
            [key]: normalized,
        });
    };

    const handleAutoBalance = () => {
        if (total === 0) {
            onChange(SKILL_PRESETS.balanced);
            return;
        }

        const normalized = {
            listening: skillWeights.listening / total,
            speaking: skillWeights.speaking / total,
            reading: skillWeights.reading / total,
            writing: skillWeights.writing / total,
            grammar: skillWeights.grammar / total,
            vocabulary: skillWeights.vocabulary / total,
        } satisfies SkillWeights;

        onChange(normalized);
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onChange(SKILL_PRESETS.communication)}>
                    Giao tiếp
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onChange(SKILL_PRESETS.academic)}>
                    Học thuật
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onChange(SKILL_PRESETS.balanced)}>
                    Cân bằng
                </Button>
            </div>

            {SKILLS.map((skill) => (
                <div className="space-y-2" key={skill.key}>
                    <div className="flex items-center justify-between">
                        <Label>{skill.label}</Label>
                        <span className="text-xs text-muted-foreground">{(skillWeights[skill.key] * 100).toFixed(1)}%</span>
                    </div>
                    <input
                        className="w-full accent-primary"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(skillWeights[skill.key] * 100)}
                        onChange={(event) => handleInputChange(skill.key, Number(event.target.value))}
                        aria-label={skill.label}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(skillWeights[skill.key] * 100)}
                    />
                </div>
            ))}

            <div className="rounded-md border p-3 text-sm flex items-center justify-between">
                <span>Tổng</span>
                <span className={Math.abs(total - 1) <= 0.001 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
                    {(total * 100).toFixed(1)}%
                </span>
            </div>

            <Button type="button" variant="secondary" className="w-full" onClick={handleAutoBalance}>
                Tự động cân bằng về 100%
            </Button>
        </div>
    );
}
