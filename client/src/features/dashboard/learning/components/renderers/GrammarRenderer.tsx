import type { LearnerGrammarContent, LearnerGrammarBlock } from './renderer.types';
import styles from './Renderer.module.css';

interface GrammarRendererProps {
    content: LearnerGrammarContent;
}

const GrammarRenderer = ({ content }: GrammarRendererProps) => {
    return (
        <div className={styles.renderer}>
            {/* Hero */}
            <div className={styles.grammarHero}>
                <p className={styles.heroHook}>{content.hero.hook}</p>
                {content.hero.contextSentences.length > 0 && (
                    <div className={styles.heroContext}>
                        {content.hero.contextSentences.map((s, i) => (
                            <p key={i} className={styles.contextSentence}>{s}</p>
                        ))}
                    </div>
                )}
            </div>

            {/* Blocks */}
            <div className={styles.blockList}>
                {content.blocks.map((block) => (
                    <GrammarBlock key={block.id} block={block} />
                ))}
            </div>

            {/* Summary Table */}
            {content.summaryTable && (
                <div className={styles.summaryTable}>
                    <table>
                        <thead>
                            <tr>
                                {content.summaryTable.columns.map((col, i) => (
                                    <th key={i}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {content.summaryTable.rows.map((row, i) => (
                                <tr key={i}>
                                    {row.map((cell, j) => (
                                        <td key={j}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Taught concepts */}
            {content.taughtConcepts.length > 0 && (
                <div className={styles.concepts}>
                    {content.taughtConcepts.map((c, i) => (
                        <span key={i} className={styles.conceptTag}>{c}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

const GrammarBlock = ({ block }: { block: LearnerGrammarBlock }) => {
    switch (block.type) {
        case 'EXPLANATION':
            return (
                <div className={styles.explanationBlock}>
                    {block.heading && <h3 className={styles.blockHeading}>{block.heading}</h3>}
                    {block.body && <p className={styles.blockBody}>{block.body}</p>}
                    {block.highlightPattern && (
                        <code className={styles.highlight}>{block.highlightPattern}</code>
                    )}
                    {block.examples && block.examples.length > 0 && (
                        <div className={styles.examples}>
                            {block.examples.map((ex, i) => (
                                <div key={i} className={styles.examplePair}>
                                    <p className={styles.exampleEn}>{ex.en}</p>
                                    <p className={styles.exampleVi}>{ex.vi}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );

        case 'CALLOUT':
            return (
                <div className={`${styles.callout} ${block.variant ? styles[`callout${block.variant}`] : ''}`}>
                    {block.text && <p>{block.text}</p>}
                </div>
            );

        case 'UNIT_CONTEXT_BLOCK':
            return (
                <div className={styles.unitContext}>
                    {block.heading && <h3 className={styles.blockHeading}>{block.heading}</h3>}
                    {block.note && <p className={styles.blockBody}>{block.note}</p>}
                    {block.examples && block.examples.length > 0 && (
                        <div className={styles.examples}>
                            {block.examples.map((ex, i) => (
                                <div key={i} className={styles.examplePair}>
                                    <p className={styles.exampleEn}>{ex.en}</p>
                                    <p className={styles.exampleVi}>{ex.vi}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );

        default:
            return null;
    }
};

export default GrammarRenderer;
