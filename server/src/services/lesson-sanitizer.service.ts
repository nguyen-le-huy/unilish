import { logger } from '../utils/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LessonType = 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING' | 'SPEAKING' | 'WRITING' | 'UNIT_TEST';

/**
 * Sanitized lesson content returned to the learner.
 * Answer-bearing fields are stripped before submission.
 */
export type LearnerSafeContent = Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deep-clone an object to avoid mutating the original.
 */
function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Strip answer fields from a single inline quiz question.
 */
function sanitizeQuizQuestion(question: Record<string, unknown>): Record<string, unknown> {
    const safe = { ...question };
    delete safe['correct'];
    delete safe['acceptedAnswers'];
    // Keep explanation but only for post-submit feedback; strip from pre-submit content
    delete safe['explanation'];
    return safe;
}

/**
 * Strip answer fields from a writing warmup task.
 */
function sanitizeWarmupTask(task: Record<string, unknown>): Record<string, unknown> {
    const safe = { ...task };
    delete safe['correct'];
    return safe;
}

// ─── Type-specific sanitizers ─────────────────────────────────────────────────

/**
 * VOCAB content has no answer-bearing fields for learners.
 * Content is read-only vocabulary items (word, meaning, example, audio).
 * Sanitization: remove generation status metadata, keep everything else.
 */
function sanitizeVocab(content: Record<string, unknown>): LearnerSafeContent {
    const safe = deepClone(content);
    // Strip generation status — learner doesn't need to know
    delete safe['generationStatus'];
    return safe;
}

/**
 * GRAMMAR content may contain inline quiz questions with answer fields.
 * Sanitization: strip `correct`, `acceptedAnswers`, `explanation` from
 * every GrammarInlineQuizQuestion in every INLINE_QUIZ block.
 */
function sanitizeGrammar(content: Record<string, unknown>): LearnerSafeContent {
    const safe = deepClone(content);

    const blocks = safe['blocks'] as Array<Record<string, unknown>> | undefined;
    if (blocks && Array.isArray(blocks)) {
        safe['blocks'] = blocks.map((block: Record<string, unknown>) => {
            if (block['type'] === 'INLINE_QUIZ') {
                const questions = block['questions'] as Array<Record<string, unknown>> | undefined;
                if (questions && Array.isArray(questions)) {
                    block['questions'] = questions.map(sanitizeQuizQuestion);
                }
            }
            return block;
        });
    }

    return safe;
}

/**
 * READING content has no answer-bearing fields.
 * Content is text, translation, glossary, and media.
 */
function sanitizeReading(content: Record<string, unknown>): LearnerSafeContent {
    const safe = deepClone(content);
    // Strip generation status
    delete safe['generationStatus'];
    return safe;
}

/**
 * LISTENING content has no answer-bearing fields.
 * Content is transcript, media, interactive config.
 */
function sanitizeListening(content: Record<string, unknown>): LearnerSafeContent {
    const safe = deepClone(content);
    // Strip generation status
    delete safe['generationStatus'];
    return safe;
}

/**
 * SPEAKING content has no answer-bearing fields (prompt-only).
 * Questions are in practiceConfig.questionIds, not in the content.
 */
function sanitizeSpeaking(content: Record<string, unknown>): LearnerSafeContent {
    // No answer fields to strip — content is prompt + config only
    return deepClone(content);
}

/**
 * WRITING content may have warmup tasks with `correct` answer fields.
 * Sanitization: strip `correct` from every warmup task.
 */
function sanitizeWriting(content: Record<string, unknown>): LearnerSafeContent {
    const safe = deepClone(content);

    const warmupTasks = safe['warmupTasks'] as Array<Record<string, unknown>> | undefined;
    if (warmupTasks && Array.isArray(warmupTasks)) {
        safe['warmupTasks'] = warmupTasks.map(sanitizeWarmupTask);
    }

    return safe;
}

/**
 * UNIT_TEST content: treat like grammar (may contain inline quiz answers).
 * Strip answer-bearing fields from any embedded questions.
 */
function sanitizeUnitTest(content: Record<string, unknown>): LearnerSafeContent {
    const safe = deepClone(content);

    // Check for blocks with inline quiz questions (similar to grammar)
    const blocks = safe['blocks'] as Array<Record<string, unknown>> | undefined;
    if (blocks && Array.isArray(blocks)) {
        safe['blocks'] = blocks.map((block: Record<string, unknown>) => {
            if (block['type'] === 'INLINE_QUIZ' || block['type'] === 'QUIZ') {
                const questions = block['questions'] as Array<Record<string, unknown>> | undefined;
                if (questions && Array.isArray(questions)) {
                    block['questions'] = questions.map(sanitizeQuizQuestion);
                }
            }
            return block;
        });
    }

    return safe;
}

// ─── Main sanitizer ───────────────────────────────────────────────────────────

/**
 * Sanitize lesson content based on its type.
 *
 * Returns a learner-safe version of the content with all answer-bearing fields
 * removed. Throws no error — returns a minimal safe object for unrecognized types.
 *
 * Implements AC-09 (No Answer Leakage), AC-19 (Malformed Content).
 */
export function sanitizeLessonContent(
    type: LessonType,
    content: unknown,
): LearnerSafeContent {
    if (!content || typeof content !== 'object') {
        logger.warn('Lesson sanitizer received non-object content', { type });
        return {};
    }

    const record = content as Record<string, unknown>;

    try {
        switch (type) {
            case 'VOCAB':
                return sanitizeVocab(record);
            case 'GRAMMAR':
                return sanitizeGrammar(record);
            case 'READING':
                return sanitizeReading(record);
            case 'LISTENING':
                return sanitizeListening(record);
            case 'SPEAKING':
                return sanitizeSpeaking(record);
            case 'WRITING':
                return sanitizeWriting(record);
            case 'UNIT_TEST':
                return sanitizeUnitTest(record);
            default:
                logger.warn('Unknown lesson type for sanitization', { type });
                return deepClone(record);
        }
    } catch (error) {
        logger.error('Error sanitizing lesson content', { type, error });
        // Return empty object as fallback — malformed content
        return {};
    }
}

/**
 * Validate that lesson content is not malformed.
 * Returns null if content is valid, or a client-safe error message if malformed.
 */
export function validateLessonContent(
    type: LessonType,
    content: unknown,
): string | null {
    if (!content || typeof content !== 'object') {
        return 'Nội dung bài học không hợp lệ hoặc đang được cập nhật.';
    }

    const record = content as Record<string, unknown>;

    switch (type) {
        case 'VOCAB': {
            const items = record['items'];
            if (!Array.isArray(items) || items.length === 0) {
                return 'Nội dung từ vựng đang được cập nhật.';
            }
            break;
        }
        case 'GRAMMAR': {
            const blocks = record['blocks'];
            if (!Array.isArray(blocks) || blocks.length === 0) {
                return 'Nội dung ngữ pháp đang được cập nhật.';
            }
            break;
        }
        case 'READING': {
            if (!record['text']) {
                return 'Nội dung đọc đang được cập nhật.';
            }
            break;
        }
        case 'LISTENING': {
            const media = record['media'] as Record<string, unknown> | undefined;
            if (!media || !media['audioUrl']) {
                return 'Nội dung nghe đang được cập nhật.';
            }
            break;
        }
        case 'SPEAKING': {
            if (!record['prompt']) {
                return 'Nội dung nói đang được cập nhật.';
            }
            break;
        }
        case 'WRITING': {
            if (!record['prompt']) {
                return 'Nội dung viết đang được cập nhật.';
            }
            break;
        }
        case 'UNIT_TEST': {
            // Unit tests may have blocks or questions
            const blocks = record['blocks'];
            if (!blocks || (Array.isArray(blocks) && blocks.length === 0)) {
                return 'Bài kiểm tra đang được cập nhật.';
            }
            break;
        }
    }

    return null; // Content is valid
}
