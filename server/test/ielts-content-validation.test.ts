import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    IeltsPracticeContentSchema,
    FormCompletionContentSchema,
    TrueFalseNotGivenContentSchema,
    AcademicTask1ChartContentSchema,
    AiConversationContentSchema,
} from '../src/validations/ielts-content.validation.js';

// ─── Form Completion ─────────────────────────────────────────────────────────

describe('FormCompletionContentSchema', () => {
    const validContent = {
        questionType: 'form_completion' as const,
        instruction: 'Listen and fill in the blanks',
        heading: 'Questions 1–10',
        audioAssetId: 'asset-123',
        items: Array.from({ length: 10 }, (_, i) => ({
            id: `l-${i + 1}`,
            order: i + 1,
            before: `Before ${i + 1}`,
            after: `After ${i + 1}`,
            acceptedAnswers: [`answer${i + 1}`],
            caseSensitive: false,
        })),
    };

    it('validates correct form completion content', () => {
        const result = FormCompletionContentSchema.safeParse(validContent);
        assert.equal(result.success, true);
    });

    it('accepts flexible item counts', () => {
        const result = FormCompletionContentSchema.safeParse({
            ...validContent,
            items: validContent.items.slice(0, 3),
        });
        assert.equal(result.success, true);
    });

    it('rejects empty item list', () => {
        const result = FormCompletionContentSchema.safeParse({
            ...validContent,
            items: [],
        });
        assert.equal(result.success, false);
    });

    it('rejects items without accepted answers', () => {
        const result = FormCompletionContentSchema.safeParse({
            ...validContent,
            items: validContent.items.map((item) => ({ ...item, acceptedAnswers: [] })),
        });
        assert.equal(result.success, false);
    });

    it('rejects missing audioAssetId', () => {
        const result = FormCompletionContentSchema.safeParse({
            ...validContent,
            audioAssetId: '',
        });
        assert.equal(result.success, false);
    });
});

// ─── True/False/Not Given ────────────────────────────────────────────────────

describe('TrueFalseNotGivenContentSchema', () => {
    const validContent = {
        questionType: 'true_false_not_given' as const,
        title: 'Passage Title',
        passage: ['Paragraph 1 content...', 'Paragraph 2 content...'],
        instruction: 'Do the following statements agree with the information in the passage?',
        statements: [
            { id: 'r-1', order: 1, text: 'Statement 1', correctAnswer: 'TRUE' as const },
            { id: 'r-2', order: 2, text: 'Statement 2', correctAnswer: 'FALSE' as const },
            { id: 'r-3', order: 3, text: 'Statement 3', correctAnswer: 'NOT_GIVEN' as const },
        ],
    };

    it('validates correct TFNG content', () => {
        const result = TrueFalseNotGivenContentSchema.safeParse(validContent);
        assert.equal(result.success, true);
    });

    it('rejects empty passage', () => {
        const result = TrueFalseNotGivenContentSchema.safeParse({
            ...validContent,
            passage: [],
        });
        assert.equal(result.success, false);
    });

    it('rejects empty statements', () => {
        const result = TrueFalseNotGivenContentSchema.safeParse({
            ...validContent,
            statements: [],
        });
        assert.equal(result.success, false);
    });

    it('rejects invalid correctAnswer enum', () => {
        const result = TrueFalseNotGivenContentSchema.safeParse({
            ...validContent,
            statements: [{ id: 'r-1', order: 1, text: 'Test', correctAnswer: 'INVALID' }],
        });
        assert.equal(result.success, false);
    });

    it('rejects more than 40 statements', () => {
        const result = TrueFalseNotGivenContentSchema.safeParse({
            ...validContent,
            statements: Array.from({ length: 41 }, (_, i) => ({
                id: `r-${i + 1}`,
                order: i + 1,
                text: `Statement ${i + 1}`,
                correctAnswer: 'TRUE' as const,
            })),
        });
        assert.equal(result.success, false);
    });
});

// ─── Academic Task 1 Chart ───────────────────────────────────────────────────

describe('AcademicTask1ChartContentSchema', () => {
    const validContent = {
        questionType: 'academic_task_1_chart' as const,
        prompt: 'The chart below shows...',
        instruction: 'Summarise the information.',
        imageAssetId: 'image-123',
        imageAlt: 'Chart description',
        minWords: 150 as const,
    };

    it('validates correct writing content', () => {
        const result = AcademicTask1ChartContentSchema.safeParse(validContent);
        assert.equal(result.success, true);
    });

    it('rejects minWords different from 150', () => {
        const result = AcademicTask1ChartContentSchema.safeParse({
            ...validContent,
            minWords: 250,
        });
        assert.equal(result.success, false);
    });

    it('rejects missing imageAssetId', () => {
        const result = AcademicTask1ChartContentSchema.safeParse({
            ...validContent,
            imageAssetId: '',
        });
        assert.equal(result.success, false);
    });
});

// ─── AI Conversation ─────────────────────────────────────────────────────────

describe('AiConversationContentSchema', () => {
    const validContent = {
        questionType: 'ai_conversation' as const,
        scenarioTitle: 'Travel booking',
        context: 'You are planning a trip...',
        openingPrompt: 'Hello! I would like to book a flight.',
        expectedDurationMinutes: 5,
        voice: 'marin',
    };

    it('validates correct speaking content', () => {
        const result = AiConversationContentSchema.safeParse(validContent);
        assert.equal(result.success, true);
    });

    it('rejects missing opening prompt', () => {
        const result = AiConversationContentSchema.safeParse({
            ...validContent,
            openingPrompt: '',
        });
        assert.equal(result.success, false);
    });

    it('rejects zero duration', () => {
        const result = AiConversationContentSchema.safeParse({
            ...validContent,
            expectedDurationMinutes: 0,
        });
        assert.equal(result.success, false);
    });
});

// ─── Discriminated Union ────────────────────────────────────────────────────

describe('IeltsPracticeContentSchema (discriminated union)', () => {
    it('accepts form_completion', () => {
        const result = IeltsPracticeContentSchema.safeParse({
            questionType: 'form_completion',
            instruction: 'Test',
            heading: 'Q1-10',
            audioAssetId: 'a-1',
            items: Array.from({ length: 10 }, (_, i) => ({
                id: `i-${i + 1}`,
                order: i + 1,
                before: 'B',
                after: 'A',
                acceptedAnswers: ['ans'],
            })),
        });
        assert.equal(result.success, true);
    });

    it('accepts true_false_not_given', () => {
        const result = IeltsPracticeContentSchema.safeParse({
            questionType: 'true_false_not_given',
            title: 'T',
            passage: ['P'],
            instruction: 'I',
            statements: [{ id: 's1', order: 1, text: 'Stmt', correctAnswer: 'TRUE' }],
        });
        assert.equal(result.success, true);
    });

    it('accepts academic_task_1_chart', () => {
        const result = IeltsPracticeContentSchema.safeParse({
            questionType: 'academic_task_1_chart',
            prompt: 'P',
            instruction: 'I',
            imageAssetId: 'img-1',
            imageAlt: 'Alt',
            minWords: 150,
        });
        assert.equal(result.success, true);
    });

    it('accepts ai_conversation', () => {
        const result = IeltsPracticeContentSchema.safeParse({
            questionType: 'ai_conversation',
            scenarioTitle: 'ST',
            context: 'Ctx',
            openingPrompt: 'OP',
            expectedDurationMinutes: 5,
            voice: 'marin',
        });
        assert.equal(result.success, true);
    });

    it('rejects unknown questionType', () => {
        const result = IeltsPracticeContentSchema.safeParse({
            questionType: 'invalid_type',
        });
        assert.equal(result.success, false);
    });

    it('rejects content with wrong fields for type', () => {
        const result = IeltsPracticeContentSchema.safeParse({
            questionType: 'form_completion',
            // Missing required fields
        });
        assert.equal(result.success, false);
    });
});
