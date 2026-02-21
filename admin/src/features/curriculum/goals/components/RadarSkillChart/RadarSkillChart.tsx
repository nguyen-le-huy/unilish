import { memo, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import type { SkillWeights } from '../../types/learning-goal.types';

interface RadarSkillChartProps {
    skillWeights: SkillWeights;
}

export const RadarSkillChart = memo(function RadarSkillChart({ skillWeights }: RadarSkillChartProps) {
    const data = useMemo(
        () => [
            { skill: 'Nghe', value: Math.round(skillWeights.listening * 100) },
            { skill: 'Nói', value: Math.round(skillWeights.speaking * 100) },
            { skill: 'Đọc', value: Math.round(skillWeights.reading * 100) },
            { skill: 'Viết', value: Math.round(skillWeights.writing * 100) },
            { skill: 'Ngữ pháp', value: Math.round(skillWeights.grammar * 100) },
            { skill: 'Từ vựng', value: Math.round(skillWeights.vocabulary * 100) },
        ],
        [skillWeights],
    );

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} outerRadius="70%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                    <Radar name="Trọng số" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
});
