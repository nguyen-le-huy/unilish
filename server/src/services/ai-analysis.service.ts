import { createHash } from 'crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { COURSE_LEVEL_TO_NUMBER } from '../models/vector/course-vector.js';
import { logger } from '../utils/logger.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const SKILL_OPTIONS = ['nghe', 'nói', 'đọc', 'viết'] as const;

const SeriesAIAnalysisSchema = z.object({
    summary: z.string().trim().min(10).max(300),
    topics: z.array(z.string().trim().min(1)).min(1).max(6),
    audience: z.enum(['beginner', 'intermediate', 'advanced', 'all']),
    skills: z.array(z.enum(SKILL_OPTIONS)).min(1).max(4),
    tags: z.array(z.string().trim().min(1)).max(8),
    levelMin: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    levelMax: z.enum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    useCase: z.string().trim().max(50),
});

export type SeriesAIAnalysis = z.infer<typeof SeriesAIAnalysisSchema>;

/** Course analysis uses the same schema as Series during migration window */
export type CourseAIAnalysis = SeriesAIAnalysis;

export interface AnalyzeBatchOptions {
    concurrency?: number;
    delayMs?: number;
}

interface AnalyzeBatchItem {
    title: string;
    description?: string | null;
}

const DEFAULT_DELAY_MS = 500;

const sleep = async (ms: number): Promise<void> => {
    if (ms <= 0) {
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
};

const normalizeUniqueList = (items: string[]): string[] => {
    const normalized = items
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    return Array.from(new Set(normalized));
};

export const createSeriesContentHash = (title: string, description?: string | null): string => {
    return createHash('sha256')
        .update(`${title.trim()}::${(description ?? '').trim()}`, 'utf8')
        .digest('hex');
};

export class AIAnalysisService {
    async analyzeCourseSeries(title: string, description: string): Promise<SeriesAIAnalysis> {
        return this.analyze(title, description);
    }

    /** Analyze a single Course — same AI pipeline, keeps levelMin/levelMax for metadata */
    async analyzeCourse(title: string, description: string): Promise<CourseAIAnalysis> {
        return this.analyze(title, description);
    }

    private async analyze(title: string, description: string): Promise<SeriesAIAnalysis> {
        const completion = await openaiClient.chat.completions.create({
            model: env.OPENAI_MODEL,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'Bạn là chuyên gia phân tích nội dung khóa học ngôn ngữ. Luôn trả về JSON hợp lệ, không kèm markdown.',
                },
                {
                    role: 'user',
                    content: this.buildPrompt(title, description),
                },
            ],
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) {
            throw new Error('AI analysis response is empty');
        }

        return this.parseAndValidate(raw);
    }

    async analyzeBatch(
        items: AnalyzeBatchItem[],
        options?: AnalyzeBatchOptions,
    ): Promise<Array<SeriesAIAnalysis | null>> {
        if (items.length === 0) {
            return [];
        }

        const concurrency = Math.max(
            1,
            Math.min(options?.concurrency ?? env.AI_ANALYSIS_CONCURRENCY, items.length),
        );
        const delayMs = Math.max(0, options?.delayMs ?? DEFAULT_DELAY_MS);
        const results: Array<SeriesAIAnalysis | null> = new Array(items.length).fill(null);
        let cursor = 0;

        const worker = async (): Promise<void> => {
            while (true) {
                const index = cursor;
                cursor += 1;

                if (index >= items.length) {
                    return;
                }

                const item = items[index];
                if (!item) {
                    continue;
                }

                try {
                    results[index] = await this.analyzeCourseSeries(item.title, item.description ?? '');
                } catch (error) {
                    logger.warn('AI analysis failed for course series item', {
                        index,
                        title: item.title,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    results[index] = null;
                }

                if (delayMs > 0) {
                    await sleep(delayMs);
                }
            }
        };

        await Promise.all(Array.from({ length: concurrency }, worker));
        return results;
    }

    private buildPrompt(title: string, description: string): string {
        return [
            'Phân tích course series sau và trả về JSON duy nhất.',
            '',
            `Title: ${title.trim()}`,
            `Description: ${description.trim()}`,
            '',
            'Schema bắt buộc:',
            '{',
            '  "summary": "string (10-300 chars)",',
            '  "topics": ["string"],',
            '  "audience": "beginner|intermediate|advanced|all",',
            '  "skills": ["nghe|nói|đọc|viết"],',
            '  "tags": ["string"],',
            '  "levelMin": "A0|A1|A2|B1|B2|C1|C2",',
            '  "levelMax": "A0|A1|A2|B1|B2|C1|C2",',
            '  "useCase": "string <= 50 chars"',
            '}',
            '',
            'Không thêm trường ngoài schema.',
        ].join('\n');
    }

    private parseAndValidate(raw: string): SeriesAIAnalysis {
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            throw new Error('AI analysis returned invalid JSON');
        }

        const candidate = typeof parsed === 'object' && parsed !== null
            ? parsed as Partial<Record<string, unknown>>
            : {};

        const normalizedCandidate: Record<string, unknown> = {
            ...candidate,
            topics: Array.isArray(candidate.topics) ? candidate.topics.slice(0, 6) : candidate.topics,
            tags: Array.isArray(candidate.tags) ? candidate.tags.slice(0, 8) : candidate.tags,
            skills: Array.isArray(candidate.skills) ? candidate.skills.slice(0, 4) : candidate.skills,
        };

        const validated = SeriesAIAnalysisSchema.parse(normalizedCandidate);
        const levelMinNum = COURSE_LEVEL_TO_NUMBER[validated.levelMin];
        const levelMaxNum = COURSE_LEVEL_TO_NUMBER[validated.levelMax];

        const normalizedLevels = levelMinNum <= levelMaxNum
            ? { levelMin: validated.levelMin, levelMax: validated.levelMax }
            : { levelMin: validated.levelMax, levelMax: validated.levelMin };

        return {
            ...validated,
            topics: normalizeUniqueList(validated.topics),
            skills: normalizeUniqueList(validated.skills) as SeriesAIAnalysis['skills'],
            tags: normalizeUniqueList(validated.tags),
            ...normalizedLevels,
        };
    }
}

export const aiAnalysisService = new AIAnalysisService();
