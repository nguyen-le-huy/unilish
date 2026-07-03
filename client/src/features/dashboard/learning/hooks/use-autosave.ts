import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveStatus =
    | 'saved'
    | 'saving'
    | 'unsaved'
    | 'conflict'
    | 'error'
    | 'offline'
    | 'permissionDenied';

export interface UseAutosaveOptions {
    /** Called to perform the actual save. */
    saveFn: () => Promise<{ success: boolean; conflict: boolean; permissionDenied?: boolean }>;
    /** Debounce window in ms after the last change before auto-saving. Default 2000. */
    debounceMs?: number;
    /** Minimum interval between saves during continuous input. Default 20000. */
    throttleMs?: number;
}

export interface UseAutosaveReturn {
    /** Current save status for the UI indicator. */
    status: AutosaveStatus;
    /** Mark the state as dirty (call after every answer change). */
    markDirty: () => void;
    /** Flush the latest state immediately (before navigation/submit). */
    flush: () => Promise<void>;
    /** Reset to saved state (e.g., after successful submit). */
    reset: () => void;
}

/**
 * Manages debounced/throttled autosave for the Lesson player.
 *
 * - `markDirty` should be called on every meaningful answer change.
 * - Saves are debounced by `debounceMs` after the last change,
 *   but no more than once per `throttleMs` during continuous input.
 * - `flush` forces an immediate save (for navigation/submission).
 * - `permissionDenied` stops the autosave loop until reset.
 * - `conflict` does not auto-retry; caller must resolve via UI.
 */
export function useAutosave({
    saveFn,
    debounceMs = 2000,
    throttleMs = 20000,
}: UseAutosaveOptions): UseAutosaveReturn {
    const [status, setStatus] = useState<AutosaveStatus>('saved');

    const statusRef = useRef(status);
    statusRef.current = status;

    const saveFnRef = useRef(saveFn);
    saveFnRef.current = saveFn;

    const isDirtyRef = useRef(false);
    const lastSaveTimeRef = useRef<number>(Date.now());
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSavingRef = useRef(false);
    const mountedRef = useRef(true);
    const permissionBlockedRef = useRef(false);
    const conflictBlockedRef = useRef(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const doSave = useCallback(async (): Promise<boolean> => {
        if (isSavingRef.current || !isDirtyRef.current) return false;
        if (permissionBlockedRef.current) return false; // Don't retry when permission denied
        if (conflictBlockedRef.current) return false; // Wait for a new edit before retrying a conflict

        isSavingRef.current = true;
        setStatus('saving');

        try {
            const result = await saveFnRef.current();
            if (!mountedRef.current) return false;

            if (result.permissionDenied) {
                permissionBlockedRef.current = true;
                setStatus('permissionDenied');
                isDirtyRef.current = true; // Keep dirty so answers are preserved
                return false;
            }

            if (result.conflict) {
                conflictBlockedRef.current = true;
                setStatus('conflict');
                // Preserve local answers, but do not loop on the same stale payload.
                return false;
            }

            if (result.success) {
                lastSaveTimeRef.current = Date.now();
                isDirtyRef.current = false;
                setStatus('saved');
                return true;
            }

            // Success = false but no conflict/permission = server error
            setStatus('error');
            return false;
        } catch {
            if (!mountedRef.current) return false;

            if (
                typeof navigator !== 'undefined' &&
                !navigator.onLine
            ) {
                setStatus('offline');
            } else {
                setStatus('error');
            }
            return false;
        } finally {
            isSavingRef.current = false;
        }
    }, []);

    // ── Debounced autosave ───────────────────────────────────────────
    useEffect(() => {
        if (!isDirtyRef.current) return;
        if (permissionBlockedRef.current) return; // Don't schedule saves when permission denied
        if (conflictBlockedRef.current) return; // Don't reschedule the same conflict

        // If enough time has passed since last save, save immediately
        const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
        if (timeSinceLastSave >= throttleMs) {
            doSave();
            return;
        }

        // Otherwise debounce
        const remaining = Math.max(0, throttleMs - timeSinceLastSave);
        const delay = Math.min(debounceMs, remaining);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            doSave();
        }, delay);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [status, doSave, debounceMs, throttleMs]);

    const markDirty = useCallback(() => {
        if (conflictBlockedRef.current) {
            conflictBlockedRef.current = false;
            setStatus('unsaved');
        }
        if (!isDirtyRef.current) {
            isDirtyRef.current = true;
            setStatus('unsaved');
        }
    }, []);

    const flush = useCallback(async (): Promise<void> => {
        // Cancel any pending debounce
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (!isDirtyRef.current) return;
        if (permissionBlockedRef.current) return; // Don't try to save when permission denied

        // Attempt save; resolve either way (preserve local answers on error)
        await doSave();
    }, [doSave]);

    const reset = useCallback(() => {
        isDirtyRef.current = false;
        permissionBlockedRef.current = false;
        conflictBlockedRef.current = false;
        lastSaveTimeRef.current = Date.now();
        setStatus('saved');
    }, []);

    return { status, markDirty, flush, reset };
}
