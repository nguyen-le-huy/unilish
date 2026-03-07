import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { MCQModuleFormValues } from '../schema';

// ─── usePart7Groups ───────────────────────────────────────────────────────────
// Manages all Part 7 grouping state: per-part group size and group pattern.

const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 7;
const DEFAULT_GROUP_SIZE = 3;

function clampGroupSize(value: number): number {
    return Math.max(MIN_GROUP_SIZE, Math.min(MAX_GROUP_SIZE, Number.isFinite(value) ? value : DEFAULT_GROUP_SIZE));
}

export interface Part7Group {
    start: number;
    size: number;
    order: number;
}

export interface UsePart7GroupsReturn {
    getPart7GroupSize: (partIndex: number) => number;
    setPart7GroupSize: (partIndex: number, value: number) => void;
    getPart7GroupPattern: (partIndex: number) => number[];
    setPart7GroupPattern: (partIndex: number, pattern: number[]) => void;
    buildPart7Groups: (partIndex: number, totalQuestions: number) => Part7Group[];
}

export function usePart7Groups(form: UseFormReturn<MCQModuleFormValues>): UsePart7GroupsReturn {
    const [groupSizes, setGroupSizes] = useState<Partial<Record<number, number>>>({});
    const [groupPatterns, setGroupPatterns] = useState<Partial<Record<number, number[]>>>({});

    function getPart7GroupSize(partIndex: number): number {
        return clampGroupSize(groupSizes[partIndex] ?? DEFAULT_GROUP_SIZE);
    }

    function setPart7GroupSize(partIndex: number, value: number): void {
        setGroupSizes((prev) => ({ ...prev, [partIndex]: clampGroupSize(value) }));
    }

    function getPart7GroupPattern(partIndex: number): number[] {
        const inMemory = groupPatterns[partIndex] ?? [];
        if (inMemory.length > 0) return inMemory;
        return form.getValues(`parts.${partIndex}.groupPattern`) ?? [];
    }

    function setPart7GroupPattern(partIndex: number, pattern: number[]): void {
        const normalized = pattern
            .map((v) => clampGroupSize(Number(v)))
            .filter((v) => Number.isFinite(v));

        if (normalized.length === 0) {
            setGroupPatterns((prev) => {
                const next = { ...prev };
                delete next[partIndex];
                return next;
            });
            form.setValue(`parts.${partIndex}.groupPattern`, [], { shouldDirty: true, shouldValidate: true });
            return;
        }

        setGroupPatterns((prev) => ({ ...prev, [partIndex]: normalized }));
        form.setValue(`parts.${partIndex}.groupPattern`, normalized, { shouldDirty: true, shouldValidate: true });
    }

    function buildPart7Groups(partIndex: number, totalQuestions: number): Part7Group[] {
        const groups: Part7Group[] = [];
        if (totalQuestions <= 0) return groups;

        const defaultSize = getPart7GroupSize(partIndex);
        const pattern = getPart7GroupPattern(partIndex);
        let start = 0;
        let order = 1;

        if (pattern.length > 0) {
            for (const raw of pattern) {
                if (start >= totalQuestions) break;
                const size = Math.min(clampGroupSize(raw), totalQuestions - start);
                groups.push({ start, size, order });
                start += size;
                order += 1;
            }
        }

        // Fill remaining questions with default group size
        while (start < totalQuestions) {
            const size = Math.min(defaultSize, totalQuestions - start);
            groups.push({ start, size, order });
            start += size;
            order += 1;
        }

        return groups;
    }

    return { getPart7GroupSize, setPart7GroupSize, getPart7GroupPattern, setPart7GroupPattern, buildPart7Groups };
}
