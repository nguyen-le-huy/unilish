import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { MCQModuleFormValues } from '../schema';

// ─── useMCQDraft ──────────────────────────────────────────────────────────────
// Loads a persisted draft on mount and auto-saves with a 500ms debounce.
// Uses form.getValues() inside setTimeout to avoid subscribing useWatch to all fields.

const DEBOUNCE_MS = 500;

export function useMCQDraft(
    draftKey: string | undefined,
    form: UseFormReturn<MCQModuleFormValues>,
): void {
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load draft on mount (runs once)
    useEffect(() => {
        if (!draftKey) return;
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as MCQModuleFormValues;
            form.reset(parsed);
        } catch {
            // Ignore malformed drafts
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);

    // Auto-save on any form change — uses a subscription to avoid global re-renders
    useEffect(() => {
        if (!draftKey) return;

        const subscription = form.watch(() => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => {
                try {
                    localStorage.setItem(draftKey, JSON.stringify(form.getValues()));
                } catch {
                    // Ignore storage failures (e.g., private browsing quota exceeded)
                }
            }, DEBOUNCE_MS);
        });

        return () => {
            subscription.unsubscribe();
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [draftKey, form]);
}
