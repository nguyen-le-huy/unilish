import { useMemo } from 'react';
import type { LearnerMatchingQuestion } from './practice.types';
import StemMedia from './StemMedia';
import styles from './Practice.module.css';

interface MatchingProps {
    question: LearnerMatchingQuestion;
    selections: Record<string, string>;
    onSelect: (itemId: string, targetId: string) => void;
    onRemove?: (itemId: string) => void;
    feedback?: { correct: boolean; explanation?: string } | null;
    typeLabel?: string;
}

const PAIR_SYMBOLS = ['❶', '❷', '❸', '❹', '❺', '❻', '❼', '❽'];

const Matching = ({ question, selections, onSelect, onRemove, feedback, typeLabel }: MatchingProps) => {
    const itemSymbols = useMemo(() => {
        const map = new Map<string, number>();
        const itemIds = Object.keys(selections);
        itemIds.forEach((id, idx) => {
            if (idx < PAIR_SYMBOLS.length) map.set(id, idx);
        });
        return map;
    }, [selections]);

    const targetToItem = useMemo(() => {
        const map = new Map<string, string>();
        for (const [itemId, targetId] of Object.entries(selections)) {
            map.set(targetId, itemId);
        }
        return map;
    }, [selections]);

    const unpairedItems = useMemo(
        () => question.items.filter((item) => !selections[item.id]),
        [question.items, selections],
    );

    const handleItemClick = (itemId: string) => {
        if (feedback) return;
        if (selections[itemId]) {
            onRemove?.(itemId);
        }
    };

    const handleTargetClick = (targetId: string) => {
        if (feedback) return;
        const alreadyPairedItem = targetToItem.get(targetId);
        if (alreadyPairedItem) {
            onRemove?.(alreadyPairedItem);
            return;
        }
        const nextItem = unpairedItems[0];
        if (nextItem) {
            onSelect(nextItem.id, targetId);
        }
    };

    return (
        <div className={styles.practiceQuestion} data-question-heading>
            {typeLabel && <span className={styles.typeBadge}>{typeLabel}</span>}
            <StemMedia stem={question.stem} />
            <div className={styles.matchingGrid}>
                <div className={styles.matchingColumn}>
                    {question.items.map((item) => {
                        const isPaired = !!selections[item.id];
                        const symbolIdx = itemSymbols.get(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`${styles.matchingItem} ${isPaired ? styles.matchingItemPaired : ''}`}
                                onClick={() => handleItemClick(item.id)}
                                disabled={!!feedback}
                                aria-label={isPaired ? `${item.text} (đã nối, nhấn để gỡ)` : item.text}
                            >
                                {symbolIdx !== undefined && (
                                    <span className={styles.matchingSymbol} aria-hidden="true">
                                        {PAIR_SYMBOLS[symbolIdx]}
                                    </span>
                                )}
                                <span>{item.text}</span>
                            </button>
                        );
                    })}
                </div>
                <div className={styles.matchingColumn}>
                    {question.targets.map((target) => {
                        const isPaired = targetToItem.has(target.id);
                        const pairedItemId = isPaired ? targetToItem.get(target.id) : undefined;
                        const symbolIdx = pairedItemId ? itemSymbols.get(pairedItemId) : undefined;
                        return (
                            <button
                                key={target.id}
                                type="button"
                                className={`${styles.matchingTarget} ${isPaired ? styles.matchingTargetSelected : ''}`}
                                onClick={() => handleTargetClick(target.id)}
                                disabled={!!feedback}
                                aria-label={isPaired ? `${target.text} (đã nối, nhấn để gỡ)` : target.text}
                            >
                                {symbolIdx !== undefined && (
                                    <span className={styles.matchingSymbol} aria-hidden="true">
                                        {PAIR_SYMBOLS[symbolIdx]}
                                    </span>
                                )}
                                <span>{target.text}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            {feedback && (
                <p className={feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}>
                    {feedback.explanation || (feedback.correct ? 'Đúng!' : 'Sai')}
                </p>
            )}
        </div>
    );
};

export default Matching;
