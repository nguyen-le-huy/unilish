import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { questionMongoRepository } from '../repositories/mongo/question.mongo.repository.js';
import type { IQuestion } from '../models/mongo/question.model.js';
import type {
    GetQuestionsQuery,
    CreateQuestionBody,
    UpdateQuestionBody,
    BulkActionBody,
    ExportQuestionsQuery,
} from '../validations/question.validation.js';
import type { QuestionListResult, UpdateQuestionData } from '../repositories/mongo/question.mongo.repository.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BulkResult {
    affected: number;
    action: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class QuestionService {
    // ─── READ ─────────────────────────────────────────────────────────────────

    async getQuestions(query: GetQuestionsQuery): Promise<QuestionListResult> {
        return questionMongoRepository.findMany(query);
    }

    async getQuestionById(id: string): Promise<IQuestion> {
        const question = await questionMongoRepository.findByIdWithDetails(id);

        if (!question) {
            throw new AppError('Không tìm thấy câu hỏi', HttpStatus.NOT_FOUND);
        }

        return question;
    }

    // ─── WRITE ────────────────────────────────────────────────────────────────

    async createQuestion(data: CreateQuestionBody, adminId: string): Promise<IQuestion> {
        const question = await questionMongoRepository.createQuestion({
            ...data,
            createdBy: adminId,
            status: 'draft',
            version: 1,
        });

        logger.info('Question created', { questionId: String(question._id), adminId });
        return question;
    }

    async updateQuestion(id: string, data: UpdateQuestionBody): Promise<IQuestion> {
        const existing = await questionMongoRepository.findByIdWithDetails(id);

        if (!existing) {
            throw new AppError('Không tìm thấy câu hỏi', HttpStatus.NOT_FOUND);
        }

        // Build update object, stripping undefined to satisfy exactOptionalPropertyTypes
        const updatePayload = Object.fromEntries(
            Object.entries({ ...data, version: (existing.version ?? 1) + 1 })
                .filter(([, v]) => v !== undefined),
        ) as UpdateQuestionData;
        const updated = await questionMongoRepository.updateQuestion(id, updatePayload);

        if (!updated) {
            throw new AppError('Cập nhật câu hỏi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('Question updated', { questionId: id, version: updated.version });
        return updated;
    }

    async updateQuestionStatus(
        id: string,
        status: IQuestion['status'],
        reviewerId?: string,
    ): Promise<IQuestion> {
        const existing = await questionMongoRepository.findByIdWithDetails(id);

        if (!existing) {
            throw new AppError('Không tìm thấy câu hỏi', HttpStatus.NOT_FOUND);
        }

        const updateData: Partial<IQuestion> = { status };

        if (status === 'published' && reviewerId) {
            (updateData as Record<string, unknown>).reviewedBy = reviewerId;
        }

        const updated = await questionMongoRepository.updateQuestion(id, updateData);

        if (!updated) {
            throw new AppError('Cập nhật trạng thái thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('Question status updated', { questionId: id, status });
        return updated;
    }

    async deleteQuestion(id: string): Promise<void> {
        const existing = await questionMongoRepository.findByIdWithDetails(id);

        if (!existing) {
            throw new AppError('Không tìm thấy câu hỏi', HttpStatus.NOT_FOUND);
        }

        // Prevent deleting published questions — must archive first
        if (existing.status === 'published') {
            throw new AppError(
                'Không thể xóa câu hỏi đã published. Hãy archive trước khi xóa.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const success = await questionMongoRepository.deleteQuestion(id);
        if (!success) {
            throw new AppError('Xóa câu hỏi thất bại', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        logger.info('Question deleted', { questionId: id, status: existing.status });
    }

    // ─── BULK ACTIONS ─────────────────────────────────────────────────────────

    async bulkAction(body: BulkActionBody): Promise<BulkResult> {
        const { ids, action, payload } = body;

        let affected = 0;

        switch (action) {
            case 'set_status': {
                if (!payload?.status) {
                    throw new AppError('Thiếu trường status trong payload', HttpStatus.BAD_REQUEST);
                }
                affected = await questionMongoRepository.bulkUpdateStatus(
                    ids,
                    payload.status as IQuestion['status'],
                );
                break;
            }

            case 'add_tag': {
                if (!payload?.tag) {
                    throw new AppError('Thiếu trường tag trong payload', HttpStatus.BAD_REQUEST);
                }
                affected = await questionMongoRepository.bulkAddTag(ids, payload.tag as string);
                break;
            }

            case 'remove_tag': {
                if (!payload?.tag) {
                    throw new AppError('Thiếu trường tag trong payload', HttpStatus.BAD_REQUEST);
                }
                affected = await questionMongoRepository.bulkRemoveTag(ids, payload.tag as string);
                break;
            }

            case 'delete': {
                // Bulk delete only allows draft/archived questions
                affected = await questionMongoRepository.bulkDelete(ids);
                break;
            }

            default:
                throw new AppError('Action không hợp lệ', HttpStatus.BAD_REQUEST);
        }

        logger.info('Bulk action completed', { action, count: ids.length, affected });
        return { affected, action };
    }

    // ─── EXPORT ───────────────────────────────────────────────────────────────

    async exportQuestions(query: ExportQuestionsQuery): Promise<Buffer> {
        const filter: Record<string, unknown> = {};

        if (query.source) filter.source = query.source;
        if (query.skill) filter.skill = query.skill;
        if (query.status) filter.status = query.status;
        if (query.difficulty) {
            const levels = query.difficulty.split(',').map((d) => d.trim()).filter(Boolean);
            filter.difficulty = levels.length === 1 ? levels[0] : { $in: levels };
        }
        if (query.tags) {
            const tagList = query.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (tagList.length > 0) filter.tags = { $all: tagList };
        }

        const questions = await questionMongoRepository.findForExport(filter);

        if (query.format === 'json') {
            return Buffer.from(JSON.stringify(questions, null, 2), 'utf-8');
        }

        // CSV export — built-in, no external dependency
        const headers = [
            'ID',
            'Source',
            'Skill',
            'Part',
            'Difficulty',
            'Status',
            'Type',
            'Stem',
            'Explanation',
            'Tags',
            'Usage Count',
            'Avg Correct Rate',
            'Created At',
        ];

        const escapeCsv = (value: unknown): string => {
            const str = value === null || value === undefined ? '' : String(value);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };

        const rows = questions.map((q) => [
            escapeCsv(String(q._id)),
            escapeCsv(q.source),
            escapeCsv(q.skill),
            escapeCsv(q.part),
            escapeCsv(q.difficulty),
            escapeCsv(q.status),
            escapeCsv(q.type),
            escapeCsv(q.stem?.text ?? ''),
            escapeCsv(q.explanation),
            escapeCsv((q.tags ?? []).join('; ')),
            escapeCsv(q.usageCount),
            escapeCsv(q.avgCorrectRate),
            escapeCsv(q.createdAt?.toISOString()),
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        return Buffer.from(csv, 'utf-8');
    }

    // ─── ANALYTICS HELPERS ────────────────────────────────────────────────────

    async incrementUsage(id: string): Promise<void> {
        await questionMongoRepository.incrementUsage(id);
    }
}

export const questionService = new QuestionService();
