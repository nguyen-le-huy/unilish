import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './TranscriptPanel.module.css';
import type { ShadowingState } from '../../hooks/use-shadowing-machine';
import type { Cue } from '../../types/shadowing.types';

interface TranscriptPanelProps {
    cues: Cue[];
    activeCueIndex: number;
    mode: 'with-transcript' | 'without-transcript';
    state: ShadowingState;
    onCueClick?: (index: number) => void;
    isEditable: boolean;
    selectedCueIds: Set<string>;
    editingCueId: string | null;
    draftText: string;
    isDirty: boolean;
    isSaving: boolean;
    isMergeable: boolean;
    editorError: string | null;
    onToggleSelect: (cueId: string) => void;
    onStartEdit: (cueId: string) => void;
    onCancelEdit: () => void;
    onDraftChange: (text: string) => void;
    onSaveEdit: (cueId: string, text: string) => void;
    onSplitCue: (cueId: string, text: string, splitIndex: number) => void;
    onMergeSelected: () => void;
    onReorder: (fromIndex: number, toIndex: number) => void;
    onResetEdits: () => void;
    onSaveAll: () => void;
}

const formatTimeRange = (cue: Cue): string => {
    return `${(cue.startMs / 1000).toFixed(1)}s → ${(cue.endMs / 1000).toFixed(1)}s`;
};

const TranscriptPanel = ({
    cues,
    activeCueIndex,
    mode,
    state,
    onCueClick,
    isEditable,
    selectedCueIds,
    editingCueId,
    draftText,
    isDirty,
    isSaving,
    isMergeable,
    editorError,
    onToggleSelect,
    onStartEdit,
    onCancelEdit,
    onDraftChange,
    onSaveEdit,
    onSplitCue,
    onMergeSelected,
    onReorder,
    onResetEdits,
    onSaveAll,
}: TranscriptPanelProps) => {
    const cueRefs = useRef<(HTMLDivElement | null)[]>([]);
    const editInputRef = useRef<HTMLTextAreaElement | null>(null);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    useEffect(() => {
        cueRefs.current[activeCueIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });
    }, [activeCueIndex]);

    const canEdit = isEditable && !isSaving;
    const toolbarLabel = useMemo(() => {
        if (!isEditable) {
            return 'Editing disabled while playing.';
        }

        return 'Edit transcript cues.';
    }, [isEditable]);

    return (
        <aside className={styles.panel} aria-label="Transcript panel">
            <header className={styles.panelHeader} aria-label={toolbarLabel}>
                <div className={styles.panelTitle}>Transcript</div>
                <div className={styles.panelActions}>
                    <button
                        className={styles.toolbarButton}
                        type="button"
                        onClick={onMergeSelected}
                        disabled={!canEdit || !isMergeable}
                    >
                        Merge selected
                    </button>
                    <button
                        className={styles.toolbarButton}
                        type="button"
                        onClick={onResetEdits}
                        disabled={!canEdit || !isDirty}
                    >
                        Reset
                    </button>
                    <button
                        className={styles.primaryToolbarButton}
                        type="button"
                        onClick={onSaveAll}
                        disabled={!canEdit || !isDirty}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </header>

            {editorError && (
                <p className={styles.editorError} role="alert">
                    {editorError}
                </p>
            )}

            {cues.map((cue, index) => {
                const isActive = index === activeCueIndex;
                const hideText = mode === 'without-transcript' && state === 'playing';
                const isSelected = selectedCueIds.has(cue.id);
                const isEditing = editingCueId === cue.id;
                const translation = cue.translationVi?.trim();
                const vocabulary = cue.vocabulary ?? [];

                return (
                    <div
                        key={cue.id}
                        ref={(element) => {
                            cueRefs.current[index] = element;
                        }}
                        className={`${styles.cueCard} ${isActive ? styles.cueCardActive : ''}`.trim()}
                        role={onCueClick ? 'button' : undefined}
                        tabIndex={onCueClick ? 0 : undefined}
                        onClick={() => {
                            if (isEditing) {
                                return;
                            }
                            onCueClick?.(index);
                        }}
                        onKeyDown={(event) => {
                            if (!onCueClick) {
                                return;
                            }

                            if (isEditing) {
                                return;
                            }

                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onCueClick(index);
                            }
                        }}
                        aria-label={`Cue ${index + 1}: ${formatTimeRange(cue)}`}
                        draggable={canEdit}
                        onDragStart={() => setDragIndex(index)}
                        onDragEnd={() => setDragIndex(null)}
                        onDragOver={(event) => {
                            if (!canEdit) {
                                return;
                            }

                            event.preventDefault();
                        }}
                        onDrop={() => {
                            if (!canEdit || dragIndex === null) {
                                return;
                            }

                            onReorder(dragIndex, index);
                            setDragIndex(null);
                        }}
                    >
                        <div className={styles.cueHeader}>
                            <label className={styles.cueSelect}>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    disabled={!canEdit}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={() => onToggleSelect(cue.id)}
                                />
                                <span className={styles.cueIndex}>#cue-{index + 1} · {formatTimeRange(cue)}</span>
                            </label>
                            <button
                                className={styles.cueAction}
                                type="button"
                                disabled={!canEdit}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onStartEdit(cue.id);
                                }}
                            >
                                Edit
                            </button>
                        </div>

                        {isEditing ? (
                            <div className={styles.editorBlock}>
                                <textarea
                                    ref={editInputRef}
                                    className={styles.editorInput}
                                    value={draftText}
                                    onChange={(event) => onDraftChange(event.target.value)}
                                    rows={4}
                                />
                                <div className={styles.editorActions}>
                                    <button
                                        className={styles.toolbarButton}
                                        type="button"
                                        disabled={!canEdit}
                                        onClick={() => {
                                            const cursor = editInputRef.current?.selectionStart ?? 0;
                                            onSplitCue(cue.id, draftText, cursor);
                                        }}
                                    >
                                        Split at cursor
                                    </button>
                                    <button
                                        className={styles.toolbarButton}
                                        type="button"
                                        onClick={onCancelEdit}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={styles.primaryToolbarButton}
                                        type="button"
                                        disabled={!canEdit}
                                        onClick={() => onSaveEdit(cue.id, draftText)}
                                    >
                                        Save cue
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.cueTextBlock}>
                                <p className={`${styles.cueText} ${hideText ? styles.cueTextHidden : ''}`.trim()}>
                                    {hideText ? '••••••••••••••••••' : cue.text}
                                </p>
                                {!hideText && translation && (
                                    <p className={styles.cueTranslation}>{translation}</p>
                                )}
                                {!hideText && vocabulary.length > 0 && (
                                    <div className={styles.cueExtras}>
                                        {vocabulary.length > 0 && (
                                            <div className={styles.cueSection}>
                                                <p className={styles.cueSectionTitle}>Vocabulary</p>
                                                <ul className={styles.cueList}>
                                                    {vocabulary.map((item) => (
                                                        <li key={`${cue.id}-${item.word}-${item.ipa}`} className={styles.cueListItem}>
                                                            <span className={styles.cueWord}>{item.word}</span>
                                                            <span className={styles.cueMetaInline}> /{item.ipa}/ · {item.pos}</span>
                                                            <span className={styles.cueTranslationInline}> — {item.translationVi}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </aside>
    );
};

export default TranscriptPanel;
