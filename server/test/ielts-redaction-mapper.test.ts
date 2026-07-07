import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import type { IExamTest } from '../src/models/mongo/exam-test.model.js';
import { toTestDetailDto } from '../src/mappers/ielts-practice.mapper.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockId(): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId();
}

function createBaseTest(overrides: Partial<Record<string, unknown>> = {}): IExamTest {
    return {
        _id: createMockId(),
        name: 'Test Name',
        format: 'ielts',
        kind: 'skill_practice',
        slug: 'test-slug',
        languageId: createMockId(),
        language: 'en',
        description: 'Test description',
        status: 'active',
        version: 1,
        skill: 'listening',
        questionType: 'form_completion',
        durationMinutes: 30,
        modules: [],
        content: {},
        scoringConfig: { framework: 'ielts_band', bandThresholds: [] },
        settings: { allowRetake: false, retakeCooldownDays: 30 },
        publishedAt: new Date(),
        createdBy: createMockId(),
        updatedBy: createMockId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        $assertPopulated: false,
        $clone: () => ({} as any),
        $getAllSubdocs: () => [],
        $isDeleted: false,
        $isNew: false,
        $isEmpty: false,
        $locals: {},
        $op: null,
        $parent: () => null as any,
        $session: () => null as any,
        $set: () => null as any,
        deleteOne: () => null as any,
        increment: () => null as any,
        replaceOne: () => null as any,
        save: () => null as any,
        toBSON: () => ({}),
        toJSON: () => ({}),
        toObject: () => ({}),
        validate: () => null as any,
        validateSync: () => null as any,
        collection: {} as any,
        db: {} as any,
        $model: '' as any,
        $__delta: '' as any,
        $__parent: '' as any,
        $__saveOptions: '' as any,
        $__schema: '' as any,
        $__scope: '' as any,
        $__setSchema: '' as any,
        $__validate: '' as any,
        $__version: '' as any,
        $__where: '' as any,
        ...overrides,
    } as unknown as IExamTest;
}

// ─── Forbidden key check ─────────────────────────────────────────────────────

const FORBIDDEN_KEYS = ['acceptedAnswers', 'correctAnswer', 'caseSensitive', 'explanation', 'gradingRubricVersion'];

function deepFindKeys(obj: unknown, depth: number = 0): string[] {
    if (depth > 10 || typeof obj !== 'object' || obj === null) return [];
    const keys: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
        keys.push(key);
        keys.push(...deepFindKeys(value, depth + 1));
    }
    return keys;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IeltsPracticeRedactionMapper', () => {
    describe('toTestDetailDto — listening form_completion', () => {
        const test = createBaseTest({
            skill: 'listening',
            questionType: 'form_completion',
            content: {
                questionType: 'form_completion',
                instruction: 'Listen and fill',
                heading: 'Q1-10',
                audioAssetId: 'asset-123',
                items: [
                    { id: 'l-1', order: 1, before: 'The ', after: ' is blue.', acceptedAnswers: ['sky'], caseSensitive: false },
                    { id: 'l-2', order: 2, before: 'She is ', after: ' years old.', acceptedAnswers: ['25', 'twenty-five'], caseSensitive: true },
                ],
            },
        });

        const dto = toTestDetailDto(test);

        it('returns skill=listening', () => {
            assert.equal(dto.skill, 'listening');
        });

        it('returns questionType=form_completion', () => {
            assert.equal(dto.questionType, 'form_completion');
        });

        it('redacts acceptedAnswers from items', () => {
            const keys = deepFindKeys(dto);
            assert.equal(keys.includes('acceptedAnswers'), false, 'acceptedAnswers must be redacted');
        });

        it('redacts caseSensitive from items', () => {
            const keys = deepFindKeys(dto);
            assert.equal(keys.includes('caseSensitive'), false, 'caseSensitive must be redacted');
        });

        it('includes redacted item fields (id, order, before, after)', () => {
            if (dto.skill === 'listening') {
                assert.equal(dto.content.items.length, 2);
                assert.equal(dto.content.items[0]?.id, 'l-1');
                assert.equal(dto.content.items[0]?.before, 'The ');
                assert.equal(dto.content.items[0]?.after, ' is blue.');
                // Ensure these are NOT in the DTO
                assert.equal('acceptedAnswers' in dto.content.items[0]!, false);
            }
        });

        it('has no forbidden keys at any depth', () => {
            const keys = deepFindKeys(dto);
            for (const forbidden of FORBIDDEN_KEYS) {
                assert.equal(keys.includes(forbidden), false, `${forbidden} must not appear in learner DTO`);
            }
        });
    });

    describe('toTestDetailDto — reading true_false_not_given', () => {
        const test = createBaseTest({
            skill: 'reading',
            questionType: 'true_false_not_given',
            content: {
                questionType: 'true_false_not_given',
                title: 'Reading Passage',
                passage: ['Para 1...', 'Para 2...'],
                instruction: 'Do the statements agree?',
                statements: [
                    { id: 'r-1', order: 1, text: 'Statement 1', correctAnswer: 'TRUE', explanation: 'Because...' },
                    { id: 'r-2', order: 2, text: 'Statement 2', correctAnswer: 'FALSE' },
                ],
            },
        });

        const dto = toTestDetailDto(test);

        it('returns skill=reading', () => {
            assert.equal(dto.skill, 'reading');
        });

        it('redacts correctAnswer from statements', () => {
            if (dto.skill === 'reading') {
                const keys = deepFindKeys(dto);
                assert.equal(keys.includes('correctAnswer'), false, 'correctAnswer must be redacted');
            }
        });

        it('redacts explanation from statements', () => {
            const keys = deepFindKeys(dto);
            assert.equal(keys.includes('explanation'), false, 'explanation must be redacted');
        });

        it('includes statement text and id', () => {
            if (dto.skill === 'reading') {
                assert.equal(dto.content.statements[0]?.text, 'Statement 1');
                assert.equal(dto.content.statements[0]?.id, 'r-1');
            }
        });
    });

    describe('toTestDetailDto — writing academic_task_1_chart', () => {
        const test = createBaseTest({
            skill: 'writing',
            questionType: 'academic_task_1_chart',
            content: {
                questionType: 'academic_task_1_chart',
                prompt: 'The chart shows...',
                instruction: 'Write a report.',
                imageAssetId: 'img-1',
                imageAlt: 'Chart alt',
                minWords: 150,
                gradingRubricVersion: 'v2',
            },
        });

        const dto = toTestDetailDto(test);

        it('returns skill=writing', () => {
            assert.equal(dto.skill, 'writing');
        });

        it('includes image info', () => {
            if (dto.skill === 'writing') {
                assert.equal(dto.content.image.assetId, 'img-1');
                assert.equal(dto.content.image.alt, 'Chart alt');
                assert.equal(dto.content.minWords, 150);
            }
        });

        it('redacts gradingRubricVersion', () => {
            const keys = deepFindKeys(dto);
            assert.equal(keys.includes('gradingRubricVersion'), false, 'gradingRubricVersion must be redacted');
        });
    });

    describe('toTestDetailDto — speaking ai_conversation', () => {
        const test = createBaseTest({
            skill: 'speaking',
            questionType: 'ai_conversation',
            content: {
                questionType: 'ai_conversation',
                scenarioTitle: 'Travel',
                context: 'You are at the airport',
                openingPrompt: 'How can I help?',
                expectedDurationMinutes: 5,
                voice: 'marin',
                gradingRubricVersion: 'v1',
            },
        });

        const dto = toTestDetailDto(test);

        it('returns skill=speaking', () => {
            assert.equal(dto.skill, 'speaking');
        });

        it('includes scenario info', () => {
            if (dto.skill === 'speaking') {
                assert.equal(dto.content.scenarioTitle, 'Travel');
                assert.equal(dto.content.openingPrompt, 'How can I help?');
                assert.equal(dto.content.voice, 'marin');
            }
        });

        it('redacts gradingRubricVersion', () => {
            const keys = deepFindKeys(dto);
            assert.equal(keys.includes('gradingRubricVersion'), false);
        });
    });

    describe('security: forbidden keys across all skills', () => {
        const skillConfigs = [
            {
                skill: 'listening' as const,
                questionType: 'form_completion' as const,
                content: {
                    questionType: 'form_completion',
                    instruction: 'I',
                    heading: 'H',
                    audioAssetId: 'a-1',
                    items: [{ id: 'l-1', order: 1, before: 'B', after: 'A', acceptedAnswers: ['ans'], caseSensitive: false }],
                },
            },
            {
                skill: 'reading' as const,
                questionType: 'true_false_not_given' as const,
                content: {
                    questionType: 'true_false_not_given',
                    title: 'T',
                    passage: ['P'],
                    instruction: 'I',
                    statements: [{ id: 'r-1', order: 1, text: 'Stmt', correctAnswer: 'TRUE', explanation: 'E' }],
                },
            },
            {
                skill: 'writing' as const,
                questionType: 'academic_task_1_chart' as const,
                content: {
                    questionType: 'academic_task_1_chart',
                    prompt: 'P',
                    instruction: 'I',
                    imageAssetId: 'img-1',
                    imageAlt: 'Alt',
                    minWords: 150,
                    gradingRubricVersion: 'v2',
                },
            },
            {
                skill: 'speaking' as const,
                questionType: 'ai_conversation' as const,
                content: {
                    questionType: 'ai_conversation',
                    scenarioTitle: 'ST',
                    context: 'Ctx',
                    openingPrompt: 'OP',
                    expectedDurationMinutes: 5,
                    voice: 'marin',
                    gradingRubricVersion: 'v1',
                },
            },
        ];

        for (const config of skillConfigs) {
            it(`redacts all forbidden keys for ${config.skill}/${config.questionType}`, () => {
                const test = createBaseTest(config);
                const dto = toTestDetailDto(test);
                const keys = deepFindKeys(dto);
                for (const forbidden of FORBIDDEN_KEYS) {
                    assert.equal(keys.includes(forbidden), false, `${forbidden} must not appear in ${config.skill} DTO`);
                }
            });
        }
    });
});
