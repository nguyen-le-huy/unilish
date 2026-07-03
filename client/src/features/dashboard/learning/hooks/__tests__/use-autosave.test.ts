// @vitest-environment jsdom
//
// Phase 4A - FE-04: Autosave hook tests

import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useAutosave } from '../use-autosave';

describe('useAutosave', () => {
    afterEach(() => {
        cleanup();
    });

    it('starts with saved status', () => {
        const { result } = renderHook(() => useAutosave({ saveFn: vi.fn() }));
        expect(result.current.status).toBe('saved');
    });

    it('changes to unsaved on markDirty', () => {
        const { result } = renderHook(() => useAutosave({ saveFn: vi.fn() }));
        act(() => result.current.markDirty());
        expect(result.current.status).toBe('unsaved');
    });

    it('flush saves immediately', async () => {
        const saveFn = vi.fn().mockResolvedValue({ success: true, conflict: false });
        const { result } = renderHook(() => useAutosave({ saveFn }));

        act(() => result.current.markDirty());

        await act(async () => {
            await result.current.flush();
        });
        expect(saveFn).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('saved');
    });

    it('flush does nothing when not dirty', async () => {
        const saveFn = vi.fn();
        const { result } = renderHook(() => useAutosave({ saveFn }));

        await act(async () => {
            await result.current.flush();
        });
        expect(saveFn).not.toHaveBeenCalled();
    });

    it('sets conflict status on conflict', async () => {
        const saveFn = vi.fn().mockResolvedValue({ success: false, conflict: true });
        const { result } = renderHook(() => useAutosave({ saveFn }));

        act(() => result.current.markDirty());
        await act(async () => {
            await result.current.flush();
        });

        expect(result.current.status).toBe('conflict');
    });

    it('does not retry the same conflict until a new edit occurs', async () => {
        const saveFn = vi.fn()
            .mockResolvedValueOnce({ success: false, conflict: true })
            .mockResolvedValue({ success: true, conflict: false });
        const { result } = renderHook(() => useAutosave({ saveFn }));

        act(() => result.current.markDirty());
        await act(async () => { await result.current.flush(); });
        await act(async () => { await result.current.flush(); });

        expect(saveFn).toHaveBeenCalledTimes(1);

        act(() => result.current.markDirty());
        await act(async () => { await result.current.flush(); });

        expect(saveFn).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe('saved');
    });

    it('sets permissionDenied and stops further saves', async () => {
        const saveFn = vi.fn().mockResolvedValue({ success: false, conflict: false, permissionDenied: true });
        const { result } = renderHook(() => useAutosave({ saveFn }));

        act(() => result.current.markDirty());
        await act(async () => {
            await result.current.flush();
        });

        expect(result.current.status).toBe('permissionDenied');

        // Further saves should not happen
        act(() => result.current.markDirty());
        await act(async () => {
            await result.current.flush();
        });
        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('reset clears permissionDenied', async () => {
        const saveFn = vi.fn()
            .mockResolvedValueOnce({ success: false, conflict: false, permissionDenied: true })
            .mockResolvedValue({ success: true, conflict: false });

        const { result } = renderHook(() => useAutosave({ saveFn }));

        act(() => result.current.markDirty());
        await act(async () => { await result.current.flush(); });
        expect(result.current.status).toBe('permissionDenied');

        act(() => result.current.reset());
        expect(result.current.status).toBe('saved');

        act(() => result.current.markDirty());
        await act(async () => { await result.current.flush(); });
        expect(saveFn).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe('saved');
    });

    it('sets error status on save failure', async () => {
        const saveFn = vi.fn().mockRejectedValue(new Error('Network error'));
        const { result } = renderHook(() => useAutosave({ saveFn }));

        act(() => result.current.markDirty());
        await act(async () => {
            await result.current.flush();
        });

        expect(result.current.status).toBe('error');
    });

    it('resets on explicit reset', () => {
        const { result } = renderHook(() => useAutosave({ saveFn: vi.fn() }));

        act(() => result.current.markDirty());
        expect(result.current.status).toBe('unsaved');

        act(() => result.current.reset());
        expect(result.current.status).toBe('saved');
    });
});
