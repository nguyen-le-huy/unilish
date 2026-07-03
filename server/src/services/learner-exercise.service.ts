import mongoose from 'mongoose';
import { Question, EQuestionType, EQuestionStatus } from '../models/mongo/question.model.js';
import { Lesson, ELessonType, EPracticeMode } from '../models/mongo/lesson.model.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

// ─── Exported Types ────────────────────────────────────────────────────────────

export type LessonType = 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING' | 'SPEAKING' | 'WRITING' | 'UNIT_TEST';

export type ExerciseKind = 'OBJECTIVE' | 'SPEAKING' | 'WRITING' | 'COMPLETION';

export type QuestionType = 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'TRUE_FALSE' | 'MATCHING' | 'ERROR_CORRECTION';

/**
 * Stem shared by all learner-safe question DTOs.
 */
export interface LearnerStem {
    text?: string;
    audioUrl?: string;
    imageUrl?: string;
}

/**
 * Build a LearnerStem from raw stem data, only including defined properties.
 */
export function buildStem(stem: { text?: string; audioUrl?: string; imageUrl?: string }): LearnerStem {
    const result: LearnerStem = {};
    if (stem.text !== undefined && stem.text !== null) result.text = stem.text;
    if (stem.audioUrl !== undefined && stem.audioUrl !== null) result.audioUrl = stem.audioUrl;
    if (stem.imageUrl !== undefined && stem.imageUrl !== null) result.imageUrl = stem.imageUrl;
    return result;
}

/**
 * Learner-safe question DTO — no answer-bearing fields.
 */
export type LearnerPracticeQuestionDto =
    | {
          id: string;
          version: number;
          type: 'MULTIPLE_CHOICE';
          stem: LearnerStem;
          options: Array<{ id: string; text: string }>;
      }
    | {
          id: string;
          version: number;
          type: 'FILL_IN_BLANK';
          stem: LearnerStem;
      }
    | {
          id: string;
          version: number;
          type: 'TRUE_FALSE';
          stem: LearnerStem;
      }
    | {
          id: string;
          version: number;
          type: 'MATCHING';
          stem: LearnerStem;
          items: Array<{ id: string; text: string }>;
          targets: Array<{ id: string; text: string }>;
      }
    | {
          id: string;
          version: number;
          type: 'ERROR_CORRECTION';
          stem: LearnerStem & { text: string };
      };

/**
 * Discriminated exercise DTO returned in LearnerLessonDto.
 */
export type LearnerExerciseDto =
    | {
          kind: 'OBJECTIVE';
          mode: 'FIXED';
          passingScore: number;
          questions: LearnerPracticeQuestionDto[];
      }
    | { kind: 'SPEAKING'; sessionRequired: true }
    | { kind: 'WRITING'; minWords: number; maxWords: number }
    | { kind: 'COMPLETION' };

/**
 * Internal raw question document shape (from MongoDB lean query).
 */
export interface RawQuestionDoc {
    _id: unknown;
    version: number;
    type: string;
    stem: {
        text?: string;
        audioUrl?: string;
        imageUrl?: string;
    };
    content: Record<string, unknown>;
    explanation?: string;
    status: string;
}

// ─── Question Sanitizers ───────────────────────────────────────────────────────

/**
 * Sanitize a MULTIPLE_CHOICE question for learner consumption.
 * Strips `isCorrect` from each option.
 */
export function sanitizeMultipleChoice(
    id: string,
    version: number,
    stem: RawQuestionDoc['stem'],
    content: Record<string, unknown>,
): LearnerPracticeQuestionDto {
    const rawOptions = content['options'] as Array<Record<string, unknown>> | undefined;

    const options: Array<{ id: string; text: string }> = [];
    if (Array.isArray(rawOptions)) {
        for (const opt of rawOptions) {
            // Allowlist: only id and text
            const optId = String(opt['id'] ?? '');
            const optText = String(opt['text'] ?? '');
            if (optId && optText) {
                options.push({ id: optId, text: optText });
            }
        }
    }

    return {
        id,
        version,
        type: 'MULTIPLE_CHOICE',
        stem: buildStem(stem),
        options,
    };
}

/**
 * Sanitize a FILL_IN_BLANK question for learner consumption.
 * Strips `correctAnswers` from content.
 */
export function sanitizeFillInBlank(
    id: string,
    version: number,
    stem: RawQuestionDoc['stem'],
): LearnerPracticeQuestionDto {
    return {
        id,
        version,
        type: 'FILL_IN_BLANK',
        stem: buildStem(stem),
    };
}

/**
 * Sanitize a TRUE_FALSE question for learner consumption.
 * Strips `isTrue` from content.
 */
export function sanitizeTrueFalse(
    id: string,
    version: number,
    stem: RawQuestionDoc['stem'],
): LearnerPracticeQuestionDto {
    return {
        id,
        version,
        type: 'TRUE_FALSE',
        stem: buildStem(stem),
    };
}

/**
 * Sanitize a MATCHING question for learner consumption.
 * Strips answer pair mapping; returns shuffled items and targets.
 */
export function sanitizeMatching(
    id: string,
    version: number,
    stem: RawQuestionDoc['stem'],
    content: Record<string, unknown>,
): LearnerPracticeQuestionDto {
    const rawPairs = content['pairs'] as Array<Record<string, unknown>> | undefined;

    const items: Array<{ id: string; text: string }> = [];
    const targets: Array<{ id: string; text: string }> = [];

    if (Array.isArray(rawPairs)) {
        for (const pair of rawPairs) {
            const leftId = String(pair['leftId'] ?? pair['id'] ?? '');
            const leftText = String(pair['leftText'] ?? pair['text'] ?? '');
            const rightId = String(pair['rightId'] ?? pair['matchId'] ?? '');
            const rightText = String(pair['rightText'] ?? pair['matchText'] ?? '');

            if (leftId && leftText) {
                items.push({ id: leftId, text: leftText });
            }
            if (rightId && rightText) {
                targets.push({ id: rightId, text: rightText });
            }
        }
    }

    return {
        id,
        version,
        type: 'MATCHING',
        stem: buildStem(stem),
        items,
        targets,
    };
}

/**
 * Sanitize an ERROR_CORRECTION question for learner consumption.
 * The stem includes the erroneous text; `correctText` is stripped.
 * The ERROR_CORRECTION type requires `text` in the stem.
 */
export function sanitizeErrorCorrection(
    id: string,
    version: number,
    stem: RawQuestionDoc['stem'],
): LearnerPracticeQuestionDto {
    const result = {
        id,
        version,
        type: 'ERROR_CORRECTION' as const,
        stem: {
            text: stem.text ?? '',
        },
    };
    // Add optional fields only when defined (cast through unknown for flexibility)
    const stemObj = result.stem as unknown as Record<string, unknown>;
    if (stem.audioUrl) stemObj['audioUrl'] = stem.audioUrl;
    if (stem.imageUrl) stemObj['imageUrl'] = stem.imageUrl;
    return result as unknown as LearnerPracticeQuestionDto;
}

// ─── Main Question Sanitizer ───────────────────────────────────────────────────

/**
 * Map a raw Question document to a learner-safe DTO based on its type.
 *
 * Returns `null` if the question type is unsupported (ESSAY, PRONUNCIATION) or
 * if the raw content is missing required fields.
 */
export function sanitizeQuestion(raw: RawQuestionDoc): LearnerPracticeQuestionDto | null {
    const id = String(raw._id);
    const version = raw.version ?? 1;
    const stem = raw.stem ?? {};
    const content = raw.content ?? {};

    try {
        switch (raw.type) {
            case EQuestionType.MULTIPLE_CHOICE:
                return sanitizeMultipleChoice(id, version, stem, content);
            case EQuestionType.FILL_IN_BLANK:
                return sanitizeFillInBlank(id, version, stem);
            case EQuestionType.TRUE_FALSE:
                return sanitizeTrueFalse(id, version, stem);
            case EQuestionType.MATCHING:
                return sanitizeMatching(id, version, stem, content);
            case EQuestionType.ERROR_CORRECTION:
                return sanitizeErrorCorrection(id, version, stem);
            default:
                // ESSAY, PRONUNCIATION — unsupported for learner objective exercises
                logger.warn('Unsupported question type for learner DTO', {
                    questionId: id,
                    type: raw.type,
                });
                return null;
        }
    } catch (error) {
        logger.error('Error sanitizing question for learner DTO', {
            questionId: id,
            type: raw.type,
            error,
        });
        return null;
    }
}

// ─── Exercise Builder ──────────────────────────────────────────────────────────

/**
 * Determine the exercise kind for a given lesson type based on business rules.
 *
 * Rules (from exercise-spec.md):
 * - VOCAB, GRAMMAR, READING, LISTENING:
 *   - DYNAMIC mode → 422 EXERCISE_UNAVAILABLE
 *   - Has valid published FIXED questions → OBJECTIVE
 *   - No valid questions → COMPLETION
 * - SPEAKING → SPEAKING
 * - WRITING → WRITING (minWords/maxWords from content.config)
 * - UNIT_TEST:
 *   - DYNAMIC mode → 422 EXERCISE_UNAVAILABLE
 *   - Has valid published FIXED questions → OBJECTIVE
 *   - No valid questions → 422 EXERCISE_UNAVAILABLE
 */
export function determineExerciseKind(
    lessonType: LessonType,
    practiceMode: string | undefined,
    validQuestionCount: number,
): { kind: ExerciseKind; requiresQuestions: boolean } {
    const isDynamic = practiceMode === EPracticeMode.DYNAMIC;

    switch (lessonType) {
        case 'VOCAB':
        case 'GRAMMAR':
        case 'READING':
        case 'LISTENING':
            if (isDynamic) {
                throw new AppError(
                    'Bài học sử dụng bài tập động chưa được hỗ trợ.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }
            if (validQuestionCount > 0) {
                return { kind: 'OBJECTIVE', requiresQuestions: true };
            }
            return { kind: 'COMPLETION', requiresQuestions: false };

        case 'SPEAKING':
            return { kind: 'SPEAKING', requiresQuestions: false };

        case 'WRITING':
            return { kind: 'WRITING', requiresQuestions: false };

        case 'UNIT_TEST':
            if (isDynamic) {
                throw new AppError(
                    'Bài học sử dụng bài tập động chưa được hỗ trợ.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }
            if (validQuestionCount === 0) {
                throw new AppError(
                    'Bài kiểm tra hiện không có câu hỏi hợp lệ.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }
            return { kind: 'OBJECTIVE', requiresQuestions: true };

        default:
            throw new AppError(
                'Loại bài học không được hỗ trợ.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
    }
}

/**
 * Load published, supported questions by their IDs and return learner-safe DTOs.
 *
 * Filters to PUBLISHED status only. Silently drops drafts, archived,
 * unsupported types, and malformed questions (with a warning log).
 * Returns the sanitized DTOs and the count of valid questions.
 */
export async function loadSanitizedQuestions(
    questionIds: mongoose.Types.ObjectId[],
): Promise<{ questions: LearnerPracticeQuestionDto[]; validCount: number }> {
    if (!questionIds || questionIds.length === 0) {
        return { questions: [], validCount: 0 };
    }

    const rawQuestions = await Question.find({
        _id: { $in: questionIds },
        status: EQuestionStatus.PUBLISHED,
    })
        .select('_id version type stem content status')
        .lean()
        .exec() as unknown as RawQuestionDoc[];

    const sanitized: LearnerPracticeQuestionDto[] = [];
    const seenIds = new Set<string>();

    // Preserve the order of questionIds
    for (const qId of questionIds) {
        const idStr = String(qId);
        if (seenIds.has(idStr)) continue; // Skip duplicates
        seenIds.add(idStr);

        const raw = rawQuestions.find((r) => String(r._id) === idStr);
        if (!raw) {
            logger.warn('Question referenced but not found or not published', {
                questionId: idStr,
            });
            continue;
        }

        const safe = sanitizeQuestion(raw);
        if (safe) {
            sanitized.push(safe);
        }
    }

    logger.info('Loaded sanitized questions for learner', {
        requestedCount: questionIds.length,
        validCount: sanitized.length,
    });

    return { questions: sanitized, validCount: sanitized.length };
}

/**
 * Build a learner exercise DTO from lesson data.
 *
 * Loads questions, sanitizes them, and returns the appropriate
 * discriminated exercise DTO.
 *
 * Implements FR-17, NFR-11, AC-23, AC-31.
 */
export async function buildLearnerExercise(
    lessonType: LessonType,
    practiceMode: string | undefined,
    questionIds: mongoose.Types.ObjectId[],
    passingScore: number | undefined,
    lessonContent: Record<string, unknown> | undefined,
): Promise<LearnerExerciseDto> {
    // 1. Load and sanitize questions
    const { questions, validCount } = await loadSanitizedQuestions(
        questionIds ?? [],
    );

    // 2. Determine exercise kind
    const { kind } = determineExerciseKind(lessonType, practiceMode, validCount);

    // 3. Build the DTO
    switch (kind) {
        case 'OBJECTIVE': {
            // Should always have questions here
            const safeQuestions = questions.length > 0
                ? questions
                : await loadSanitizedQuestions(questionIds ?? []).then((r) => r.questions);

            return {
                kind: 'OBJECTIVE',
                mode: 'FIXED',
                passingScore: passingScore ?? 80,
                questions: safeQuestions,
            };
        }

        case 'SPEAKING':
            return { kind: 'SPEAKING', sessionRequired: true };

        case 'WRITING': {
            // Extract minWords/maxWords from lesson content.config
            const config = lessonContent?.['config'] as
                | { minWords?: number; maxWords?: number }
                | undefined;
            return {
                kind: 'WRITING',
                minWords: config?.minWords ?? 50,
                maxWords: config?.maxWords ?? 500,
            };
        }

        case 'COMPLETION':
            return { kind: 'COMPLETION' };
    }
}

/**
 * Load lesson question metadata for validation purposes.
 *
 * Returns a map of questionId -> { type, version } for all published questions
 * referenced by the lesson's practiceConfig.questionIds.
 *
 * Used by checkpoint/submission validation to reject unknown, stale, or
 * mismatched-type question references.
 *
 * Implements FR-19 (answer validation before grading).
 */
export async function loadLessonQuestionMap(
    questionIds: mongoose.Types.ObjectId[],
): Promise<Map<string, { type: string; version: number }>> {
    const questionMap = new Map<string, { type: string; version: number }>();

    if (!questionIds || questionIds.length === 0) {
        return questionMap;
    }

    const rawQuestions = await Question.find({
        _id: { $in: questionIds },
        status: EQuestionStatus.PUBLISHED,
    })
        .select('_id type version')
        .lean()
        .exec() as Array<{ _id: unknown; type: string; version: number }>;

    for (const q of rawQuestions) {
        questionMap.set(String(q._id), {
            type: q.type,
            version: q.version,
        });
    }

    return questionMap;
}
