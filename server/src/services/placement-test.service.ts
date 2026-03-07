import mongoose from 'mongoose';
import OpenAI from 'openai';
import { z } from 'zod';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { placementTestMongoRepository } from '../repositories/mongo/placement-test.mongo.repository.js';
import { Question } from '../models/mongo/question.model.js';
import { Concept, EConceptType } from '../models/mongo/concept.model.js';
import {
    EPlacementTestStatus,
    type IPlacementTest,
    type IModuleMCQ,
} from '../models/mongo/placement-test.model.js';
import type {
    GetPlacementTestsQuery,
    CreatePlacementTestBody,
    UpdatePlacementTestBody,
    AnalyticsQuery,
    PushToQuestionBankBody,
} from '../validations/placement-test.validation.js';
import type { PlacementTestListResult } from '../repositories/mongo/placement-test.mongo.repository.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PoolValidationResult {
    isValid: boolean;
    modules: {
        moduleIndex: number;
        moduleName: string;
        type: string;
        parts?: PoolPartValidation[];
    }[];
}

export interface PoolPartValidation {
    part: number;
    name: string;
    poolTag: string;
    required: number;
    minimumPool: number;
    publishedCount: number;
    isValid: boolean;
}

interface ParsedPart3QuestionItem {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    transcript?: string;
    explanation?: string;
}

const aiParsedQuestionSchema = z.object({
    questionNumber: z.number().int().positive().optional(),
    question: z.string().trim().min(1),
    optionA: z.string().trim().min(1),
    optionB: z.string().trim().min(1),
    optionC: z.string().trim().min(1),
    optionD: z.string().trim().min(1),
    correctOption: z.string().trim().optional(),
    transcript: z.string().trim().optional(),
    explanation: z.string().trim().optional(),
});

const aiParseResponseSchema = z.object({
    questionItems: z.array(aiParsedQuestionSchema).default([]),
});

type AiParsedQuestion = z.infer<typeof aiParsedQuestionSchema>;

// ─── Default CEFR Thresholds ──────────────────────────────────────────────────

const DEFAULT_CEFR_THRESHOLDS = [
    { level: 'A1' as const, mcqMin: 0, mcqMax: 0.25, writingMin: 0, writingMax: 0.25, speakingMin: 0, speakingMax: 0.25 },
    { level: 'A2' as const, mcqMin: 0.25, mcqMax: 0.45, writingMin: 0.25, writingMax: 0.45, speakingMin: 0.25, speakingMax: 0.45 },
    { level: 'B1' as const, mcqMin: 0.45, mcqMax: 0.60, writingMin: 0.45, writingMax: 0.60, speakingMin: 0.45, speakingMax: 0.60 },
    { level: 'B2' as const, mcqMin: 0.60, mcqMax: 0.75, writingMin: 0.60, writingMax: 0.75, speakingMin: 0.60, speakingMax: 0.75 },
    { level: 'C1' as const, mcqMin: 0.75, mcqMax: 0.90, writingMin: 0.75, writingMax: 0.90, speakingMin: 0.75, speakingMax: 0.90 },
    { level: 'C2' as const, mcqMin: 0.90, mcqMax: 1, writingMin: 0.90, writingMax: 1, speakingMin: 0.90, speakingMax: 1 },
];

// ─── Service ──────────────────────────────────────────────────────────────────

class PlacementTestService {

    private static extractAnswerKeyMap(rawText: string): Map<number, 'A' | 'B' | 'C' | 'D'> {
        const answerMap = new Map<number, 'A' | 'B' | 'C' | 'D'>();

        const lines = rawText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        let pendingQuestionNumber: number | null = null;

        for (const line of lines) {
            const normalizedLine = line.replace(/\s+/g, ' ');

            const standaloneNumberMatch = normalizedLine.match(/^(\d{1,3})$/);
            if (standaloneNumberMatch) {
                pendingQuestionNumber = Number(standaloneNumberMatch[1] ?? 0);
                continue;
            }

            const pendingAnswerOnlyMatch = normalizedLine.match(/^(?:đáp\s*án\s*đúng|đáp\s*án|answer\s*key|answers?)\s*[:\-]?\s*([ABCD])\b/i);
            if (pendingQuestionNumber && pendingAnswerOnlyMatch) {
                const option = (pendingAnswerOnlyMatch[1] ?? '').toUpperCase() as 'A' | 'B' | 'C' | 'D';
                answerMap.set(pendingQuestionNumber, option);
                pendingQuestionNumber = null;
                continue;
            }

            const explicitAnswerMatch = normalizedLine.match(
                /^(\d{1,3})\s*(?:[\.|\)|\-|:]\s*)?(?:đáp\s*án\s*đúng|đáp\s*án|answer\s*key|answers?)\s*[:\-]?\s*([ABCD])\b/i,
            );
            if (explicitAnswerMatch) {
                const questionNumber = Number(explicitAnswerMatch[1] ?? 0);
                const option = (explicitAnswerMatch[2] ?? '').toUpperCase() as 'A' | 'B' | 'C' | 'D';
                if (questionNumber > 0) {
                    answerMap.set(questionNumber, option);
                }
                pendingQuestionNumber = null;
                continue;
            }

            const compactAnswerMatch = normalizedLine.match(/^(\d{1,3})\s*[\.|\)|\-|:]?\s*([ABCD])\b$/i);
            if (compactAnswerMatch) {
                const questionNumber = Number(compactAnswerMatch[1] ?? 0);
                const option = (compactAnswerMatch[2] ?? '').toUpperCase() as 'A' | 'B' | 'C' | 'D';
                if (questionNumber > 0) {
                    answerMap.set(questionNumber, option);
                }
                pendingQuestionNumber = null;
                continue;
            }

            pendingQuestionNumber = null;
        }

        return answerMap;
    }

    private static normalizeQuestionText(text: string): string {
        return text
            .replace(/^\s*(?:q(?:uestion)?\s*)?\d{1,3}\s*[\.|\)|\-|:]\s*/i, '')
            .trim();
    }

    private static normalizeOptionText(text: string): string {
        return text
            .replace(/^\s*[\(\[]?[ABCD][\)\]\.|\-|:]\s*/i, '')
            .trim();
    }

    private static extractPart7GroupPattern(rawText: string): number[] {
        const lines = rawText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        for (const line of lines) {
            if (/^[2-7]{4,}$/.test(line)) {
                return line.split('').map((digit) => Number(digit));
            }
        }

        return [];
    }

    private static extractQuestionsFromRawText(rawText: string, part: 1 | 2 | 3 | 4 | 5 | 6 | 7): AiParsedQuestion[] {
        const lines = rawText
            .replace(/\r/g, '')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        const parsedItems: AiParsedQuestion[] = [];

        let currentQuestionNumber: number | undefined;
        let currentQuestionParts: string[] = [];
        let currentOptions: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {};

        const flushCurrent = () => {
            const question = currentQuestionParts.join(' ').trim();
            if (!question) {
                return;
            }

            const optionA = (currentOptions.A ?? '').trim();
            const optionB = (currentOptions.B ?? '').trim();
            const optionC = (currentOptions.C ?? '').trim();
            const optionD = part === 2 ? 'N/A' : (currentOptions.D ?? '').trim();

            if (!optionA || !optionB || !optionC || !optionD) {
                return;
            }

            parsedItems.push({
                questionNumber: currentQuestionNumber,
                question,
                optionA,
                optionB,
                optionC,
                optionD,
                correctOption: '',
                transcript: '',
                explanation: '',
            });
        };

        for (const line of lines) {
            if (/(?:^|\b)(?:đáp\s*án\s*đúng|đáp\s*án|answer\s*key|answers?)(?:\b|:)/i.test(line)) {
                continue;
            }

            const questionMatch = line.match(/^(\d{1,3})\s*[\.|\)|\-|:]\s*(.+)$/i);
            if (questionMatch) {
                flushCurrent();
                currentQuestionNumber = Number(questionMatch[1] ?? 0);
                currentQuestionParts = [(questionMatch[2] ?? '').trim()];
                currentOptions = {};
                continue;
            }

            const bareQuestionNumberMatch = line.match(/^(\d{1,3})$/);
            if (bareQuestionNumberMatch) {
                flushCurrent();
                currentQuestionNumber = Number(bareQuestionNumberMatch[1] ?? 0);
                currentQuestionParts = [`Question ${currentQuestionNumber}`];
                currentOptions = {};
                continue;
            }

            if (/^\d{4,}$/.test(line)) {
                // Ignore compact group pattern markers like 222233434455555 in Part 7 content.
                continue;
            }

            const optionMatch = line.match(/^(?:[\(\[])?([ABCD])(?:[\)\]])?\s*[\.|\)|\-|:]\s*(.+)$/i);
            if (optionMatch) {
                const optionKey = (optionMatch[1] ?? '').toUpperCase() as 'A' | 'B' | 'C' | 'D';
                const optionValue = (optionMatch[2] ?? '').trim();
                if (optionValue.length > 0) {
                    currentOptions[optionKey] = optionValue;
                }
                continue;
            }

            if (currentQuestionParts.length === 0) {
                continue;
            }

            const lastOptionKey = (['D', 'C', 'B', 'A'] as const).find((optionKey) => {
                const value = currentOptions[optionKey];
                return typeof value === 'string' && value.length > 0;
            });

            if (lastOptionKey) {
                currentOptions[lastOptionKey] = `${currentOptions[lastOptionKey] ?? ''} ${line}`.trim();
            } else {
                currentQuestionParts = [...currentQuestionParts, line];
            }
        }

        flushCurrent();
        return parsedItems;
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    async getAll(query: GetPlacementTestsQuery): Promise<PlacementTestListResult> {
        const filters: import('../repositories/mongo/placement-test.mongo.repository.js').PlacementTestListFilters = {
            page: query.page,
            limit: query.limit,
            ...(query.search !== undefined && { search: query.search }),
            ...(query.language !== undefined && { language: query.language }),
            ...(query.status !== undefined && { status: query.status }),
        };
        return placementTestMongoRepository.findMany(filters);
    }

    async getById(id: string): Promise<IPlacementTest> {
        const test = await placementTestMongoRepository.findByIdWithModules(id);
        if (!test) {
            throw new AppError('Không tìm thấy bài kiểm tra đầu vào', HttpStatus.NOT_FOUND);
        }
        return test;
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    async create(data: CreatePlacementTestBody, adminId: string): Promise<IPlacementTest> {
        const test = await placementTestMongoRepository.create({
            ...data,
            languageId: new mongoose.Types.ObjectId(data.languageId),
            status: EPlacementTestStatus.DRAFT,
            version: 1,
            cefrMapping: data.cefrMapping ?? {
                weights: { mcq: 0.4, writing: 0.3, speaking: 0.3 },
                thresholds: DEFAULT_CEFR_THRESHOLDS,
            },
            createdBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IPlacementTest>);

        logger.info('PlacementTest created', {
            testId: String(test._id),
            language: test.language,
            adminId,
        });

        return test;
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    /**
     * Update a draft/paused test — overwrite in place.
     * Active tests: archive current, create new version.
     */
    async update(id: string, data: UpdatePlacementTestBody, adminId: string): Promise<IPlacementTest> {
        const existing = await this.getById(id);

        const updated = await placementTestMongoRepository.updateById(id, {
            ...data,
            updatedBy: new mongoose.Types.ObjectId(adminId),
        } as unknown as Partial<IPlacementTest>);

        if (!updated) {
            throw new AppError('Cập nhật bài kiểm tra thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('PlacementTest updated', {
            testId: id,
            language: existing.language,
            adminId,
        });

        return updated;
    }

    // ─── STATUS CHANGE ────────────────────────────────────────────────────────

    /**
     * Change status with business rules enforcement:
     * - active → validate pool BEFORE switching
     * - active → archives previous active version for same language+name
     * - active → bumps version if current version was already published before
     */
    async updateStatus(
        id: string,
        status: 'active' | 'paused' | 'archived',
        adminId: string,
    ): Promise<IPlacementTest> {
        const existing = await this.getById(id);

        if (status === EPlacementTestStatus.ACTIVE) {
            // Validate pool before publishing
            const validation = await this.validatePool(id);
            if (!validation.isValid) {
                const failedParts = validation.modules
                    .flatMap((m) => m.parts ?? [])
                    .filter((p) => !p.isValid)
                    .map((p) => `${p.poolTag} (cần ${p.minimumPool}, có ${p.publishedCount})`)
                    .join(', ');
                throw new AppError(
                    `Không đủ câu hỏi trong pool: ${failedParts}`,
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
            }

            // Archive any other active tests for same language+name
            await placementTestMongoRepository.archiveActiveByLanguageName(
                existing.language,
                existing.name,
                id,
            );

            // Bump version if this was previously published
            if (existing.status !== EPlacementTestStatus.DRAFT) {
                const latestVersion = await placementTestMongoRepository.getLatestVersion(
                    existing.language,
                    existing.name,
                );
                await placementTestMongoRepository.updateById(id, {
                    status: EPlacementTestStatus.ACTIVE,
                    version: latestVersion + 1,
                    updatedBy: new mongoose.Types.ObjectId(adminId),
                });
            }
        }

        const updated = await placementTestMongoRepository.updateById(id, {
            status,
            updatedBy: new mongoose.Types.ObjectId(adminId),
        });

        if (!updated) {
            throw new AppError('Cập nhật trạng thái thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('PlacementTest status changed', {
            testId: id,
            from: existing.status,
            to: status,
            adminId,
        });

        return updated;
    }

    // ─── VERSION HISTORY ──────────────────────────────────────────────────────

    async getVersionHistory(id: string): Promise<Partial<IPlacementTest>[]> {
        const existing = await this.getById(id);
        return placementTestMongoRepository.findVersionHistory(existing.language, existing.name);
    }

    // ─── ROLLBACK ─────────────────────────────────────────────────────────────

    /**
     * Creates a new draft document as a copy of the target version.
     * The original archived version is preserved.
     */
    async rollback(id: string, targetVersion: number, adminId: string): Promise<IPlacementTest> {
        const target = await this.getById(id);

        const versionSnapshot = await placementTestMongoRepository.findByLanguageNameVersion(
            target.language,
            target.name,
            targetVersion,
        );

        if (!versionSnapshot) {
            throw new AppError(
                `Không tìm thấy phiên bản v${targetVersion}`,
                HttpStatus.NOT_FOUND,
            );
        }

        const latestVersion = await placementTestMongoRepository.getLatestVersion(
            target.language,
            target.name,
        );

        const { _id, createdAt, updatedAt, ...rest } = versionSnapshot as IPlacementTest & {
            createdAt: Date;
            updatedAt: Date;
        };

        // Suppress unused variable warnings for destructured fields
        void _id;
        void createdAt;
        void updatedAt;

        const rollbackDraft = await placementTestMongoRepository.create({
            ...rest,
            status: EPlacementTestStatus.DRAFT,
            version: latestVersion + 1,
            createdBy: new mongoose.Types.ObjectId(adminId),
        } as Partial<IPlacementTest>);

        logger.info('PlacementTest rolled back', {
            sourceId: id,
            fromVersion: targetVersion,
            newVersion: latestVersion + 1,
            adminId,
        });

        return rollbackDraft;
    }

    // ─── POOL VALIDATION ──────────────────────────────────────────────────────

    /**
     * For each MCQ module, count published questions by poolTag.
     * Rule: pool must have at least (questionsCount × 2) published questions.
     */
    async validatePool(id: string): Promise<PoolValidationResult> {
        const test = await this.getById(id);

        const moduleResults = await Promise.all(
            test.modules.map(async (module, idx) => {
                if (module.type !== 'mcq') {
                    return {
                        moduleIndex: idx,
                        moduleName: module.name,
                        type: module.type,
                    };
                }

                const mcqModule = module as IModuleMCQ;

                const partResults = await Promise.all(
                    mcqModule.parts.map(async (part) => {
                        const manualCount = part.manualContent?.questionItems?.length ?? 0;

                        // If the part is fully covered by manually-entered questions,
                        // skip pool validation — no need to query the question bank.
                        if (manualCount >= part.questionsCount) {
                            return {
                                part: part.part,
                                name: part.name,
                                poolTag: part.poolTag,
                                required: part.questionsCount,
                                minimumPool: part.questionsCount,
                                publishedCount: manualCount,
                                isValid: true,
                            };
                        }

                        const publishedCount = await Question.countDocuments({
                            tags: part.poolTag,
                            status: 'published',
                        }).exec();

                        const minimumPool = part.questionsCount * 2; // ×2 buffer requirement
                        return {
                            part: part.part,
                            name: part.name,
                            poolTag: part.poolTag,
                            required: part.questionsCount,
                            minimumPool,
                            publishedCount,
                            isValid: publishedCount >= minimumPool,
                        };
                    }),
                );

                return {
                    moduleIndex: idx,
                    moduleName: mcqModule.name,
                    type: 'mcq',
                    parts: partResults,
                };
            }),
        );

        const isValid = moduleResults.every(
            (m) => !m.parts || m.parts.every((p) => p.isValid),
        );

        return { isValid, modules: moduleResults };
    }

    // ─── ANALYTICS ────────────────────────────────────────────────────────────

    async getAnalytics(id: string, query: AnalyticsQuery): Promise<Record<string, unknown>> {
        await this.getById(id); // validate exists
        return placementTestMongoRepository.getAnalyticsSummary(id, query.range);
    }

    async parseMcqPart3Import(rawText: string, part: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 3): Promise<{ questionItems: ParsedPart3QuestionItem[]; groupPattern?: number[] }> {
        const answerMap = PlacementTestService.extractAnswerKeyMap(rawText);
        const part7GroupPattern = part === 7 ? PlacementTestService.extractPart7GroupPattern(rawText) : [];

        const partLabel = part === 1
            ? 'Part 1 (Photographs)'
            : part === 2
                ? 'Part 2 (Question-Response)'
                : part === 5
                    ? 'Part 5 (Incomplete Sentences)'
                    : part === 6
                        ? 'Part 6 (Text Completion)'
                        : part === 7
                            ? 'Part 7 (Reading Comprehension)'
                : part === 4
                    ? 'Part 4 (Short Talks)'
                    : 'Part 3 (Short Conversations)';
        const partSpecificRules = part === 1
            ? `
5) Với Part 1, nếu không có câu hỏi rõ ràng, đặt question = "Part 1 Question <số câu>".
6) Với Part 1, BẮT BUỘC tạo transcript tiếng Anh cho mỗi câu theo dạng đọc đề TOEIC.
7) Với Part 1, BẮT BUỘC tạo explanation bằng tiếng Việt, ngắn gọn (1-2 câu), có dịch ý phương án đúng.
8) Trả thêm trường "transcript" và "explanation" cho từng câu.
`
            : part === 2
                ? `
5) Với Part 2, trích xuất theo dạng Question-Response.
6) Với Part 2, question là câu hỏi/lời nói chính (ví dụ: "Where should I put ...?").
7) Với Part 2, chỉ có A/B/C. Hãy đặt optionD = "N/A".
8) Với Part 2, transcript là câu hỏi/lời nói chính bằng tiếng Anh.
9) Với Part 2, BẮT BUỘC tạo explanation bằng tiếng Việt ngắn gọn, có dịch ý đáp án đúng.
`
                : part === 5
                    ? `
5) Với Part 5, mỗi câu là 1 câu hoàn chỉnh có chỗ trống hoặc lựa chọn ngữ pháp/từ vựng.
6) question phải là câu gốc của đề (giữ nguyên dấu câu, chỗ trống nếu có).
7) Trích xuất đủ optionA/optionB/optionC/optionD.
8) transcript có thể để rỗng.
9) BẮT BUỘC tạo explanation bằng tiếng Việt ngắn gọn, nêu vì sao đáp án đúng phù hợp ngữ pháp/ngữ nghĩa.
`
                    : part === 6
                        ? `
5) Với Part 6, trích xuất các câu theo cụm 4 câu (điền vào đoạn văn), nhưng output vẫn là danh sách questionItems phẳng theo thứ tự.
6) question giữ nguyên câu/vế câu trong đề bài; nếu là câu chọn câu phù hợp trong đoạn văn thì giữ nguyên nội dung.
7) Trích xuất đủ optionA/optionB/optionC/optionD.
8) transcript để chuỗi rỗng nếu không có.
9) BẮT BUỘC tạo explanation bằng tiếng Việt ngắn gọn cho đáp án đúng.
`
                        : part === 7
                            ? `
5) Với Part 7, trích xuất câu hỏi đọc hiểu theo đúng thứ tự số câu.
6) Trích xuất đủ optionA/optionB/optionC/optionD cho từng câu.
7) Nếu input có dòng chỉ gồm chữ số như "222233434455555", đó là group pattern (số câu theo từng cụm passage); KHÔNG đưa dòng này vào option/question.
8) transcript để chuỗi rỗng nếu không có.
9) BẮT BUỘC tạo explanation bằng tiếng Việt ngắn gọn cho đáp án đúng.
`
            : `
5) Với Part ${part}, transcript/explanation có thể để chuỗi rỗng nếu không suy ra được.
`;

        const prompt = `
    Bạn là trợ lý trích xuất dữ liệu đề TOEIC ${partLabel}.
Từ văn bản thô bên dưới, hãy trích xuất các câu hỏi trắc nghiệm thành JSON.

YÊU CẦU:
1) Chỉ lấy các câu dạng trắc nghiệm có 4 lựa chọn A/B/C/D.
2) Chuẩn hóa output thành đúng schema:
{
  "questionItems": [
    {
      "questionNumber": 32,
      "question": "...",
      "optionA": "...",
      "optionB": "...",
      "optionC": "...",
      "optionD": "...",
            "correctOption": "A",
            "transcript": "...",
            "explanation": "..."
    }
  ]
}
3) Nếu không xác định được đáp án, để "correctOption" là chuỗi rỗng "".
4) Không trả Markdown, chỉ trả JSON hợp lệ.
${partSpecificRules}

NỘI DUNG ĐẦU VÀO:
${rawText}
`.trim();

        let aiQuestionItems: AiParsedQuestion[] = [];
        try {
            const completion = await openaiClient.chat.completions.create({
                model: env.OPENAI_MODEL,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You extract TOEIC MCQ items and return strict JSON only.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            const raw = completion.choices[0]?.message?.content ?? '{}';
            const parsedJson = JSON.parse(raw) as unknown;
            const validated = aiParseResponseSchema.safeParse(parsedJson);

            if (validated.success) {
                aiQuestionItems = validated.data.questionItems;
            } else {
                logger.warn('[PlacementTestService] Invalid AI parse schema, fallback to raw parser', {
                    issues: validated.error.issues,
                });
            }
        } catch (error) {
            logger.warn('[PlacementTestService] OpenAI parse failed, fallback to raw parser', { error });
        }

        const sourceItems = aiQuestionItems.length > 0
            ? aiQuestionItems
            : PlacementTestService.extractQuestionsFromRawText(rawText, part);

        const questionItems: ParsedPart3QuestionItem[] = sourceItems
            .map((item, index) => {
                const inferredQuestionNumber = Number((item.question.match(/\d{1,3}/)?.[0] ?? '').trim());
                const questionNumber = item.questionNumber ?? (Number.isFinite(inferredQuestionNumber) && inferredQuestionNumber > 0
                    ? inferredQuestionNumber
                    : undefined);

                const aiCorrect = (item.correctOption ?? '').trim().toUpperCase();
                const answerKeyCorrect = questionNumber ? answerMap.get(questionNumber) : undefined;
                const correctOption =
                    (['A', 'B', 'C', 'D'].includes(aiCorrect)
                        ? (aiCorrect as 'A' | 'B' | 'C' | 'D')
                        : answerKeyCorrect)
                    ?? 'A';

                const normalizedOptionA = PlacementTestService.normalizeOptionText(item.optionA);
                const normalizedOptionB = PlacementTestService.normalizeOptionText(item.optionB);
                const normalizedOptionC = PlacementTestService.normalizeOptionText(item.optionC);
                const normalizedOptionD = part === 2
                    ? 'N/A'
                    : PlacementTestService.normalizeOptionText(item.optionD);
                const normalizedQuestion = PlacementTestService.normalizeQuestionText(item.question);
                const resolvedQuestionNumber = questionNumber ?? (index + 1);

                const part1Question = normalizedQuestion.length > 0
                    ? normalizedQuestion
                    : `Part 1 Question ${resolvedQuestionNumber}`;

                const fallbackPart1Transcript = `Look at the picture marked number ${resolvedQuestionNumber} in your test book.\n(A) ${normalizedOptionA}\n(B) ${normalizedOptionB}\n(C) ${normalizedOptionC}\n(D) ${normalizedOptionD}`;

                const transcript = part === 1
                    ? ((item.transcript ?? '').trim() || fallbackPart1Transcript)
                    : part === 2
                        ? ((item.transcript ?? '').trim() || normalizedQuestion)
                    : ((item.transcript ?? '').trim() || '');
                const explanation = part === 1
                    ? ((item.explanation ?? '').trim() || `Đáp án đúng là ${correctOption}.`)
                    : part === 2
                        ? ((item.explanation ?? '').trim() || `Đáp án đúng là ${correctOption}.`) 
                        : part === 5
                            ? ((item.explanation ?? '').trim() || `Đáp án đúng là ${correctOption}.`) 
                            : part === 6
                                ? ((item.explanation ?? '').trim() || `Đáp án đúng là ${correctOption}.`) 
                                : part === 7
                                    ? ((item.explanation ?? '').trim() || `Đáp án đúng là ${correctOption}.`) 
                    : ((item.explanation ?? '').trim() || '');

                const normalizedCorrectOption = part === 2 && correctOption === 'D'
                    ? 'A'
                    : correctOption;

                return {
                    question: part === 1 ? part1Question : normalizedQuestion,
                    optionA: normalizedOptionA,
                    optionB: normalizedOptionB,
                    optionC: normalizedOptionC,
                    optionD: normalizedOptionD,
                    correctOption: normalizedCorrectOption,
                    ...(transcript ? { transcript } : {}),
                    ...(explanation ? { explanation } : {}),
                };
            })
            .filter((item) =>
                item.question.length > 0
                && item.optionA.length > 0
                && item.optionB.length > 0
                && item.optionC.length > 0
                && item.optionD.length > 0,
            );

        if (questionItems.length === 0) {
            throw new AppError('Không trích xuất được câu hỏi hợp lệ từ nội dung đã dán', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const normalizedGroupPattern = part === 7
            ? part7GroupPattern.filter((groupSize) => Number.isFinite(groupSize) && groupSize >= 2 && groupSize <= 7)
            : [];

        const shouldAttachGroupPattern =
            part === 7
            && normalizedGroupPattern.length > 0
            && normalizedGroupPattern.reduce((sum, groupSize) => sum + groupSize, 0) === questionItems.length;

        return {
            questionItems,
            ...(shouldAttachGroupPattern ? { groupPattern: normalizedGroupPattern } : {}),
        };
    }

    // ─── POST /placement-tests/:id/push-to-question-bank ─────────────────────
    async pushToQuestionBank(
        id: string,
        adminId: string,
        body: PushToQuestionBankBody,
    ): Promise<{ inserted: number; skipped: number }> {
        const test = await this.getById(id);
        const languageId = new mongoose.Types.ObjectId(test.languageId as unknown as string);
        const adminObjId = new mongoose.Types.ObjectId(adminId);
        let inserted = 0;
        let skipped = 0;

        for (const module of test.modules) {
            if (module.type !== 'mcq') continue;
            const mcqModule = module as IModuleMCQ;

            for (const part of mcqModule.parts) {
                const items = part.manualContent?.questionItems ?? [];
                if (items.length === 0) continue;

                const skill = part.part <= 4 ? 'listening' : 'reading';

                // Upsert Concept by poolTag as key
                let concept = await Concept.findOne({ languageId, key: part.poolTag }).lean();
                if (!concept) {
                    concept = await Concept.create({
                        languageId,
                        key: part.poolTag,
                        name: part.name,
                        type: EConceptType.SKILL,
                    });
                }

                for (const item of items) {
                    const exists = await Question.exists({
                        languageId,
                        'stem.text': item.question,
                        tags: part.poolTag,
                    });
                    if (exists) {
                        skipped++;
                        continue;
                    }

                    const options = (['A', 'B', 'C', 'D'] as const).map((k) => ({
                        id: k,
                        text: item.options[k],
                        isCorrect: item.correctOption === k,
                    }));

                    await Question.create({
                        languageId,
                        testedConcept: concept._id,
                        source: 'placement_test',
                        skill,
                        part: part.part,
                        difficulty: 'B1',
                        difficultyLevel: 3,
                        type: 'MULTIPLE_CHOICE',
                        stem: {
                            text: item.question,
                            ...(item.audioUrl ? { audioUrl: item.audioUrl } : {}),
                            ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
                        },
                        content: { options },
                        ...(item.explanation ? { explanation: item.explanation } : {}),
                        tags: [part.poolTag],
                        status: body.status,
                        createdBy: adminObjId,
                    });
                    inserted++;
                }
            }
        }

        logger.info(`pushToQuestionBank: test=${id} inserted=${inserted} skipped=${skipped}`);
        return { inserted, skipped };
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const placementTestService = new PlacementTestService();
