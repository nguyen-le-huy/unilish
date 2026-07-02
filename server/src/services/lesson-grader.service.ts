import mongoose from 'mongoose';
import { Question } from '../models/mongo/question.model.js';
import { logger } from '../utils/logger.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradingResult {
    score: number;
    maxScore: number;
    passed: boolean;
    feedback: Record<string, unknown>;
}

interface QuestionAnswer {
    questionId: string;
    answer: unknown;
}

interface QuestionDoc {
    _id: unknown;
    type: string;
    content: Record<string, unknown>;
    stem: Record<string, unknown>;
    explanation?: string;
}

// ─── Text normalization ───────────────────────────────────────────────────────

/**
 * Normalize a text answer for comparison.
 * - Trim whitespace
 * - Lowercase
 * - Collapse multiple spaces
 * - Remove leading/trailing punctuation
 */
export function normalizeAnswer(text: string): string {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
        .replace(/[.!?]+$/g, '');
}

// ─── Type-specific graders ────────────────────────────────────────────────────

/**
 * Grade a MULTIPLE_CHOICE question.
 * Student answer is the option ID string.
 */
function gradeMultipleChoice(
    question: QuestionDoc,
    studentAnswer: unknown,
): { correct: boolean; maxScore: number } {
    const content = question.content as Record<string, unknown>;
    const options = content['options'] as Array<Record<string, unknown>> | undefined;

    if (!Array.isArray(options)) {
        return { correct: false, maxScore: 1 };
    }

    const correctOption = options.find((opt) => opt['isCorrect'] === true);
    if (!correctOption) {
        return { correct: false, maxScore: 1 };
    }

    const isCorrect = String(studentAnswer) === String(correctOption['id']);
    return { correct: isCorrect, maxScore: 1 };
}

/**
 * Grade a FILL_IN_BLANK question.
 * Student answer is a string. Compare against accepted answers (normalized).
 */
function gradeFillInBlank(
    question: QuestionDoc,
    studentAnswer: unknown,
): { correct: boolean; maxScore: number } {
    const content = question.content as Record<string, unknown>;
    const correctAnswers = content['correctAnswers'] as string[] | undefined;

    if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
        return { correct: false, maxScore: 1 };
    }

    const normalizedStudent = normalizeAnswer(String(studentAnswer ?? ''));
    const isCorrect = correctAnswers.some(
        (answer) => normalizeAnswer(answer) === normalizedStudent,
    );

    return { correct: isCorrect, maxScore: 1 };
}

/**
 * Grade a TRUE_FALSE question.
 * Student answer is a boolean or string "true"/"false".
 */
function gradeTrueFalse(
    question: QuestionDoc,
    studentAnswer: unknown,
): { correct: boolean; maxScore: number } {
    const content = question.content as Record<string, unknown>;
    const isTrue = content['isTrue'] as boolean | undefined;

    const studentBool =
        typeof studentAnswer === 'boolean'
            ? studentAnswer
            : String(studentAnswer).toLowerCase() === 'true';

    return { correct: studentBool === isTrue, maxScore: 1 };
}

/**
 * Grade an ERROR_CORRECTION question.
 * Student answer is the corrected text string.
 */
function gradeErrorCorrection(
    question: QuestionDoc,
    studentAnswer: unknown,
): { correct: boolean; maxScore: number } {
    const content = question.content as Record<string, unknown>;
    const correctText = content['correctText'] as string | undefined;

    if (!correctText) {
        return { correct: false, maxScore: 1 };
    }

    const isCorrect =
        normalizeAnswer(String(studentAnswer ?? '')) ===
        normalizeAnswer(correctText);

    return { correct: isCorrect, maxScore: 1 };
}

/**
 * Grade a MATCHING question.
 * Student answer is a record of {leftId: rightId}.
 * Award points for each correct match.
 */
function gradeMatching(
    question: QuestionDoc,
    studentAnswer: unknown,
): { correct: boolean; maxScore: number; correctCount: number; totalPairs: number } {
    const content = question.content as Record<string, unknown>;
    const pairs = content['pairs'] as Array<Record<string, unknown>> | undefined;

    if (!Array.isArray(pairs) || pairs.length === 0) {
        return { correct: false, maxScore: 1, correctCount: 0, totalPairs: 1 };
    }

    const studentMap = studentAnswer as Record<string, string> | undefined;
    if (!studentMap) {
        return { correct: false, maxScore: pairs.length, correctCount: 0, totalPairs: pairs.length };
    }

    let correctCount = 0;
    for (const pair of pairs) {
        const leftId = String(pair['leftId'] ?? pair['id']);
        const rightId = String(pair['rightId'] ?? pair['matchId']);
        if (studentMap[leftId] === rightId) {
            correctCount++;
        }
    }

    const totalPairs = pairs.length;
    return {
        correct: correctCount === totalPairs,
        maxScore: totalPairs,
        correctCount,
        totalPairs,
    };
}

// ─── Main grader ──────────────────────────────────────────────────────────────

/**
 * Grade a set of student responses against the authored questions.
 *
 * Loads question definitions from the database, grades each response,
 * and returns aggregate score, pass/fail, and per-question feedback.
 *
 * For non-objective types (ESSAY, PRONUNCIATION), returns null score
 * with a feedback placeholder — actual evaluation happens asynchronously.
 */
export async function gradeResponses(
    questionIds: string[],
    responses: Record<string, unknown>,
    passingScore: number,
): Promise<GradingResult> {
    if (questionIds.length === 0) {
        return {
            score: 0,
            maxScore: 0,
            passed: true, // No questions = auto-pass
            feedback: { message: 'No questions to grade' },
        };
    }

    // Load all questions
    const questions = await Question.find({
        _id: { $in: questionIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
        .select('_id type content explanation stem')
        .lean()
        .exec() as unknown as QuestionDoc[];

    if (questions.length === 0) {
        return {
            score: 0,
            maxScore: 0,
            passed: false,
            feedback: { message: 'No valid questions found' },
        };
    }

    const questionMap = new Map<string, QuestionDoc>();
    for (const q of questions) {
        questionMap.set(String(q._id), q);
    }

    let totalScore = 0;
    let maxTotalScore = 0;
    const perQuestionFeedback: Record<string, unknown> = {};

    for (const qId of questionIds) {
        const question = questionMap.get(qId);
        if (!question) {
            logger.warn('Question not found during grading', { questionId: qId });
            continue;
        }

        const studentAnswer = responses[qId];
        const questionType = question.type;

        let result: { correct: boolean; maxScore: number; [key: string]: unknown };

        switch (questionType) {
            case 'MULTIPLE_CHOICE':
                result = gradeMultipleChoice(question, studentAnswer);
                break;
            case 'FILL_IN_BLANK':
                result = gradeFillInBlank(question, studentAnswer);
                break;
            case 'TRUE_FALSE':
                result = gradeTrueFalse(question, studentAnswer);
                break;
            case 'ERROR_CORRECTION':
                result = gradeErrorCorrection(question, studentAnswer);
                break;
            case 'MATCHING':
                result = gradeMatching(question, studentAnswer);
                break;
            case 'ESSAY':
            case 'PRONUNCIATION':
                // Non-objective: mark as ungraded
                result = { correct: false, maxScore: 1 };
                break;
            default:
                logger.warn('Unknown question type for grading', { type: questionType });
                result = { correct: false, maxScore: 1 };
        }

        totalScore += result.correct ? result.maxScore : 0;
        maxTotalScore += result.maxScore;

        perQuestionFeedback[qId] = {
            correct: result.correct,
            maxScore: result.maxScore,
            ...(result as any).correctCount !== undefined
                ? { correctCount: (result as any).correctCount, totalPairs: (result as any).totalPairs }
                : {},
            explanation: question.explanation ?? null,
        };
    }

    const score = maxTotalScore > 0
        ? Math.round((totalScore / maxTotalScore) * 100)
        : 0;

    return {
        score,
        maxScore: maxTotalScore,
        passed: score >= passingScore,
        feedback: {
            totalScore,
            maxTotalScore,
            percentage: score,
            perQuestion: perQuestionFeedback,
        },
    };
}

/**
 * Grade Speaking/Writing — always passes with evaluation-as-feedback.
 * Objective questions embedded in these lessons are graded normally;
 * the subjective evaluation is placeholder until AI grading completes.
 */
export function gradeSubjectivePass(): GradingResult {
    return {
        score: 100,
        maxScore: 100,
        passed: true,
        feedback: {
            message: 'Submission received. Evaluation pending.',
        },
    };
}
