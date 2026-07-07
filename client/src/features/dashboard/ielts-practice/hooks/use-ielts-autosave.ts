/* ──────────────────────────────────────────────────────────────
 * useIeltsAutosave — Debounced autosave with local recovery
 * FR-07 / AC-09, AC-10: Revision control, conflict detection
 * FR-08 / AC-11: Offline recovery via localStorage cache
 * ────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSaveDraft } from './use-ielts-attempt';
import type { SaveState } from '../components/SaveStatus/SaveStatus';
import type { SaveDraftPayload } from '../api/ielts-practice.service';

const DEBOUNCE_MS = 1500;
const RECOVERY_KEY_PREFIX = 'ielts-recovery:';

export interface AutosaveOptions {
  attemptId: string;
  revision: number;
  /** Build the draft payload from current local state. Called on each save tick. */
  buildPayload: () => Omit<SaveDraftPayload, 'revision'>;
  /** Unique key for local recovery cache (e.g. attemptId) */
  recoveryKey: string;
}

export interface AutosaveResult {
  saveState: SaveState;
  localRevision: number;
  /** Force a save immediately (e.g. before submit) */
  flush: () => Promise<number>;
  /** Reset conflict state after resolution */
  clearConflict: () => void;
  conflictData: { latestRevision: number; savedAt: string } | null;
  /** Mark draft as dirty and schedule debounced save */
  markDirty: () => void;
}

export function useIeltsAutosave({
  attemptId,
  revision,
  buildPayload,
  recoveryKey,
}: AutosaveOptions): AutosaveResult {
  const saveMutation = useSaveDraft();

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [conflictData, setConflictData] = useState<{
    latestRevision: number;
    savedAt: string;
  } | null>(null);
  const [localRevision, setLocalRevision] = useState(revision);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const lastSavedPayloadRef = useRef<string>('');

  // Track external revision changes
  useEffect(() => {
    setLocalRevision(revision);
  }, [revision]);

  // ── Save to server ───────────────────────────────────
  const executeSave = useCallback(async (): Promise<number> => {
    if (!attemptId) return localRevision;

    const payload = buildPayload();
    const payloadStr = JSON.stringify(payload);

    // Skip if nothing changed since last save
    if (payloadStr === lastSavedPayloadRef.current) {
      setSaveState('saved');
      return localRevision;
    }

    setSaveState('saving');

    try {
      const result = await saveMutation.mutateAsync({
        attemptId,
        payload: {
          revision: localRevision,
          ...payload,
        },
      });

      // Update local recovery with new revision
      setLocalRevision(result.revision);
      lastSavedPayloadRef.current = payloadStr;
      persistToLocal(recoveryKey, payload, result.revision);
      setSaveState('saved');
      setConflictData(null);
      isDirtyRef.current = false;
      return result.revision;
    } catch (err: unknown) {
      const errResp = err as { response?: { status?: number; data?: { errorCode?: string; data?: { latestRevision: number; savedAt: string } } } };
      const status = errResp?.response?.status;
      const errorCode = errResp?.response?.data?.errorCode;

      if (status === 409 && errorCode === 'REVISION_CONFLICT') {
        const conflict = errResp.response!.data!.data!;
        setConflictData({
          latestRevision: conflict.latestRevision,
          savedAt: conflict.savedAt,
        });
        setSaveState('conflict');
        throw err;
      } else {
        // Network error or other — keep local cache, show unsynced
        persistToLocal(recoveryKey, payload, localRevision);
        setSaveState('unsynced');
        throw err;
      }
    }
  }, [attemptId, buildPayload, localRevision, saveMutation, recoveryKey]);

  // ── Debounced autosave ──────────────────────────────
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Show saving immediately on user input
    if (saveState !== 'saving' && saveState !== 'unsynced') {
      setSaveState('saving');
    }

    debounceRef.current = setTimeout(() => {
      void executeSave().catch(() => undefined);
    }, DEBOUNCE_MS);
  }, [executeSave, saveState]);

  // ── Flush (immediate save, for submit) ──────────────
  const flush = useCallback(async (): Promise<number> => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return executeSave();
  }, [executeSave]);

  // ── Clear conflict ──────────────────────────────────
  const clearConflict = useCallback(() => {
    setConflictData(null);
    setSaveState('idle');
  }, []);

  // ── Cleanup ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    saveState,
    localRevision,
    flush,
    clearConflict,
    conflictData,
    markDirty,
  };
}

// ─── Local recovery helpers ─────────────────────────────

function persistToLocal(
  key: string,
  payload: Record<string, unknown>,
  revision: number,
): void {
  try {
    window.localStorage.setItem(
      `${RECOVERY_KEY_PREFIX}${key}`,
      JSON.stringify({ payload, revision, timestamp: Date.now() }),
    );
  } catch {
    // Storage full — silently ignore
  }
}

export function getLocalRecovery(
  key: string,
): { payload: Record<string, unknown>; revision: number } | null {
  try {
    const raw = window.localStorage.getItem(`${RECOVERY_KEY_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.payload && typeof parsed.revision === 'number') {
      return { payload: parsed.payload, revision: parsed.revision };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLocalRecovery(key: string): void {
  try {
    window.localStorage.removeItem(`${RECOVERY_KEY_PREFIX}${key}`);
  } catch {
    // Ignore
  }
}
