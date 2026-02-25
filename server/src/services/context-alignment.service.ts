import { LessonMongoRepository } from '../repositories/mongo/lesson.mongo.repository.js';
import { Unit } from '../models/mongo/unit.model.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

interface UnitContextSeed {
    scenario: string;
    keywords: string[];
}

export class ContextAlignmentService {
    private static readonly lessonRepo = new LessonMongoRepository();

    private static readonly STOP_WORDS = new Set([
        'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'have', 'will',
        'was', 'were', 'are', 'you', 'they', 'them', 'his', 'her', 'our', 'their', 'been',
        'trong', 'nhung', 'va', 'voi', 'cho', 'cua', 'mot', 'nhung', 'nguoi', 'bai', 'hoc',
        'tai', 'khi', 'sau', 'truoc', 'noi', 'lam', 'duoc', 'khong', 'the', 'nay',
    ]);

    static async getUnitContext(lessonId: string): Promise<UnitContextSeed> {
        const lesson = await this.lessonRepo.findByIdFull(lessonId);
        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const unit = await Unit.findById(lesson.unitId)
            .select('contextSeed')
            .lean()
            .exec();

        if (!unit) {
            throw new AppError('Chương học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const scenario = (unit.contextSeed?.scenario ?? '').trim();
        const keywords = (unit.contextSeed?.keywords ?? [])
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length > 0);

        return { scenario, keywords };
    }

    static async assertLessonAligned(
        lessonId: string,
        candidateTexts: string[],
        moduleName: 'VOCAB' | 'GRAMMAR' | 'READING' | 'LISTENING',
    ): Promise<void> {
        const context = await this.getUnitContext(lessonId);
        const haystack = this.normalise(candidateTexts.join(' '));

        if (!haystack) {
            throw new AppError(
                `[${moduleName}] Nội dung rỗng, không thể kiểm tra bám ngữ cảnh Unit.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const normalizedKeywords = context.keywords.map((keyword) => this.normalise(keyword));
        const matchedKeywords = normalizedKeywords.filter((keyword) => keyword && haystack.includes(keyword));

        if (normalizedKeywords.length > 0) {
            const minimumMatches = normalizedKeywords.length <= 3
                ? 1
                : Math.max(2, Math.ceil(normalizedKeywords.length * 0.3));

            if (matchedKeywords.length < minimumMatches) {
                throw new AppError(
                    `[${moduleName}] Nội dung chưa bám context của Unit. Cần dùng thêm từ khóa trong Unit.contextSeed.keywords.`,
                    HttpStatus.BAD_REQUEST,
                );
            }
            return;
        }

        const scenarioTokens = this.extractScenarioTokens(context.scenario);
        if (scenarioTokens.length === 0) {
            return;
        }

        const hasScenarioSignal = scenarioTokens.some((token) => haystack.includes(token));
        if (!hasScenarioSignal) {
            throw new AppError(
                `[${moduleName}] Nội dung chưa bám theo scenario của Unit.contextSeed.`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    private static normalise(input: string): string {
        return input
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private static extractScenarioTokens(scenario: string): string[] {
        const normalized = this.normalise(scenario);
        if (!normalized) return [];

        return normalized
            .split(' ')
            .filter((token) => token.length >= 4 && !this.STOP_WORDS.has(token));
    }
}
