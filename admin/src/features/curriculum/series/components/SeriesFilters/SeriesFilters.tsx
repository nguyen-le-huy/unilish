import { memo, useCallback } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
// Cross-feature imports via public barrel (FSD §2)
import { useLanguages } from '@/features/curriculum/languages';
import { useLearningGoals } from '@/features/curriculum/goals';

interface SeriesFiltersProps {
    languageId?: string;
    learningGoalId?: string;
    onLanguageChange: (id: string | undefined) => void;
    onGoalChange: (id: string | undefined) => void;
}

const ALL_VALUE = '__all__';

export const SeriesFilters = memo(function SeriesFilters({
    languageId,
    learningGoalId,
    onLanguageChange,
    onGoalChange,
}: SeriesFiltersProps) {
    const { data: languages = [] } = useLanguages({ isActive: true });
    const { data: goalsData } = useLearningGoals({ limit: 100, isActive: true });
    const goals = goalsData?.data ?? [];

    const handleLanguageChange = useCallback(
        (value: string) => onLanguageChange(value === ALL_VALUE ? undefined : value),
        [onLanguageChange],
    );

    const handleGoalChange = useCallback(
        (value: string) => onGoalChange(value === ALL_VALUE ? undefined : value),
        [onGoalChange],
    );

    return (
        <div className="flex flex-wrap gap-2">
            {/* ── Language filter ── */}
            <Select
                value={languageId ?? ALL_VALUE}
                onValueChange={handleLanguageChange}
            >
                <SelectTrigger
                    className="w-44"
                    aria-label="Lọc theo ngôn ngữ"
                >
                    <SelectValue placeholder="Ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_VALUE}>Tất cả ngôn ngữ</SelectItem>
                    {languages.map((lang) => (
                        <SelectItem key={lang._id} value={lang._id}>
                            {lang.name} ({lang.code.toUpperCase()})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* ── Learning goal filter ── */}
            <Select
                value={learningGoalId ?? ALL_VALUE}
                onValueChange={handleGoalChange}
            >
                <SelectTrigger
                    className="w-52"
                    aria-label="Lọc theo mục tiêu học tập"
                >
                    <SelectValue placeholder="Mục tiêu học tập" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_VALUE}>Tất cả mục tiêu</SelectItem>
                    {goals.map((goal) => (
                        <SelectItem key={goal._id} value={goal._id}>
                            {goal.title}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
});
