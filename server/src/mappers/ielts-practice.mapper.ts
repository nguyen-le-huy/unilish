import type { IExamTest } from '../models/mongo/exam-test.model.js';
import { env } from '../config/env.js';
import type {
    TestSummaryDto,
    TestDetailDto,
    ListeningDetailDto,
    ReadingDetailDto,
    WritingDetailDto,
    SpeakingDetailDto,
} from '../types/ielts-practice.types.js';

// ─── Helper: extract item count from content ────────────────────────────────

function getItemCount(test: Partial<IExamTest>): number {
    if (!test.content || !test.questionType) return 0;

    const questionType = test.questionType;
    const content = test.content as Record<string, unknown>;

    switch (questionType) {
        case 'form_completion': {
            const items = content.items;
            return Array.isArray(items) ? items.length : 0;
        }
        case 'true_false_not_given': {
            const statements = content.statements;
            return Array.isArray(statements) ? statements.length : 0;
        }
        case 'academic_task_1_chart':
            return 1; // Single essay task
        case 'ai_conversation':
            return 0; // Conversation-based, no fixed item count
        default:
            return 0;
    }
}

function isHttpUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function resolveAudioUrl(assetId: string): string {
    const source = assetId.trim();
    if (!source) return '';

    const serverBase = env.SERVER_URL.replace(/\/+$/, '');
    const isAbsoluteHttpUrl = /^https?:\/\//i.test(source);
    if (source.includes('/api/audio/')) {
        return isAbsoluteHttpUrl ? source : `${serverBase}${source.startsWith('/') ? '' : '/'}${source}`;
    }

    if (isAbsoluteHttpUrl) {
        try {
            const url = new URL(source);
            const key = url.pathname.replace(/^\/+/, '');
            return key ? `${serverBase}/api/audio/${key}` : source;
        } catch {
            return source;
        }
    }

    return `${serverBase}/api/audio/${source.replace(/^\/+/, '').replace(/^api\/audio\//, '')}`;
}

// ─── Summary DTO ────────────────────────────────────────────────────────────

export function toTestSummaryDto(
    test: Partial<IExamTest>,
    attemptCount: number = 0,
    activeAttemptId?: string,
): TestSummaryDto {
    const dto: TestSummaryDto = {
        id: String(test._id),
        slug: test.slug ?? '',
        title: test.name ?? '',
        skill: test.skill as TestSummaryDto['skill'],
        questionType: test.questionType as TestSummaryDto['questionType'],
        itemCount: getItemCount(test),
        durationMinutes: test.durationMinutes ?? 0,
        attemptCount,
        availability: 'free',
        publishedAt: test.publishedAt?.toISOString() ?? new Date().toISOString(),
    };

    // Conditionally include optional fields due to exactOptionalPropertyTypes
    if (test.description) {
        dto.description = test.description;
    }
    if (activeAttemptId) {
        dto.activeAttemptId = activeAttemptId;
    }

    return dto;
}

// ─── Detail DTO (redacted — no answer keys) ─────────────────────────────────

export function toTestDetailDto(test: IExamTest, attemptCount: number = 0, activeAttemptId?: string): TestDetailDto {
    const baseSummary = toTestSummaryDto(test, attemptCount, activeAttemptId);

    const questionType = test.questionType;
    const content = (test.content ?? {}) as Record<string, unknown>;

    switch (questionType) {
        case 'form_completion': {
            const items = (content.items as Array<Record<string, unknown>> | undefined) ?? [];
            const audioAssetId = (content.audioAssetId as string) ?? '';
            return {
                ...baseSummary,
                skill: 'listening',
                questionType: 'form_completion',
                version: test.version,
                content: {
                    instruction: (content.instruction as string) ?? '',
                    heading: (content.heading as string) ?? '',
                    audio: {
                        assetId: audioAssetId,
                        url: resolveAudioUrl(audioAssetId),
                        durationSeconds: 0,
                    },
                    items: items.map((item) => ({
                        id: item.id as string,
                        order: item.order as number,
                        before: item.before as string,
                        after: item.after as string,
                    })),
                },
            } satisfies ListeningDetailDto;
        }

        case 'true_false_not_given': {
            const statements = (content.statements as Array<Record<string, unknown>> | undefined) ?? [];
            const passage = (content.passage as string[] | undefined) ?? [];
            return {
                ...baseSummary,
                skill: 'reading',
                questionType: 'true_false_not_given',
                version: test.version,
                content: {
                    title: (content.title as string) ?? '',
                    passage,
                    instruction: (content.instruction as string) ?? '',
                    statements: statements.map((stmt) => ({
                        id: stmt.id as string,
                        order: stmt.order as number,
                        text: stmt.text as string,
                        // No correctAnswer, explanation fields
                    })),
                },
            } satisfies ReadingDetailDto;
        }

        case 'academic_task_1_chart': {
            return {
                ...baseSummary,
                skill: 'writing',
                questionType: 'academic_task_1_chart',
                version: test.version,
                content: {
                    prompt: (content.prompt as string) ?? '',
                    instruction: (content.instruction as string) ?? '',
                    image: {
                        assetId: (content.imageAssetId as string) ?? '',
                        url: (content.imageAssetId as string) ?? '',
                        alt: (content.imageAlt as string) ?? '',
                    },
                    minWords: (content.minWords as number) ?? 150,
                },
            } satisfies WritingDetailDto;
        }

        case 'ai_conversation': {
            return {
                ...baseSummary,
                skill: 'speaking',
                questionType: 'ai_conversation',
                version: test.version,
                content: {
                    scenarioTitle: (content.scenarioTitle as string) ?? '',
                    context: (content.context as string) ?? '',
                    openingPrompt: (content.openingPrompt as string) ?? '',
                    expectedDurationMinutes: (content.expectedDurationMinutes as number) ?? 0,
                    voice: (content.voice as string) ?? '',
                },
            } satisfies SpeakingDetailDto;
        }

        default:
            // Fallback: return base with generic content
            return {
                ...baseSummary,
                skill: test.skill as 'listening',
                questionType: test.questionType as 'form_completion',
                version: test.version,
                content: {
                    instruction: '',
                    heading: '',
                    audio: { assetId: '', url: '', durationSeconds: 0 },
                    items: [],
                },
            } satisfies ListeningDetailDto;
    }
}

// ─── Map array of tests to summary DTOs ─────────────────────────────────────

export function toTestSummaryDtoList(
    tests: Array<Partial<IExamTest>>,
): TestSummaryDto[] {
    return tests.map((test) => toTestSummaryDto(test));
}
