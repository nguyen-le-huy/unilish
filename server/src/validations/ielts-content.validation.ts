import { z } from 'zod';

// ─── Item schemas ────────────────────────────────────────────────────────────

const ListeningItemSchema = z.object({
    id: z.string().trim().min(1),
    order: z.number().int().positive(),
    before: z.string().trim().min(1),
    after: z.string().trim().min(1),
    acceptedAnswers: z.array(z.string().trim().min(1)).min(1, 'Cần ít nhất một đáp án'),
    caseSensitive: z.boolean().optional().default(false),
});

const DraftListeningItemSchema = z.object({
    id: z.string().trim().min(1),
    order: z.number().int().positive(),
    before: z.string(),
    after: z.string(),
    acceptedAnswers: z.array(z.string()).min(1, 'Cần ít nhất một đáp án'),
    caseSensitive: z.boolean().optional().default(false),
});

const StatementSchema = z.object({
    id: z.string().trim().min(1),
    order: z.number().int().positive(),
    text: z.string().trim().min(1),
    correctAnswer: z.enum(['TRUE', 'FALSE', 'NOT_GIVEN']),
    explanation: z.string().trim().optional(),
});

const DraftStatementSchema = z.object({
    id: z.string().trim().min(1),
    order: z.number().int().positive(),
    text: z.string(),
    correctAnswer: z.enum(['TRUE', 'FALSE', 'NOT_GIVEN']),
    explanation: z.string().optional(),
});

// ─── Content schemas per question type ───────────────────────────────────────

export const FormCompletionContentSchema = z.object({
    questionType: z.literal('form_completion'),
    instruction: z.string().trim().min(1, 'Instruction là bắt buộc'),
    heading: z.string().trim().min(1, 'Heading là bắt buộc'),
    audioAssetId: z.string().trim().min(1, 'Audio asset là bắt buộc'),
    items: z
        .array(ListeningItemSchema)
        .min(1, 'Cần ít nhất 1 item cho Form Completion'),
});

export const DraftFormCompletionContentSchema = z.object({
    questionType: z.literal('form_completion'),
    instruction: z.string(),
    heading: z.string(),
    audioAssetId: z.string(),
    items: z
        .array(DraftListeningItemSchema)
        .min(1, 'Cần ít nhất 1 item cho Form Completion'),
});

export const TrueFalseNotGivenContentSchema = z.object({
    questionType: z.literal('true_false_not_given'),
    title: z.string().trim().min(1, 'Title là bắt buộc'),
    passage: z
        .array(z.string().trim().min(1))
        .min(1, 'Cần ít nhất một đoạn passage'),
    instruction: z.string().trim().min(1, 'Instruction là bắt buộc'),
    statements: z
        .array(StatementSchema)
        .min(1, 'Cần ít nhất một statement')
        .max(40, 'Tối đa 40 statements'),
});

export const DraftTrueFalseNotGivenContentSchema = z.object({
    questionType: z.literal('true_false_not_given'),
    title: z.string(),
    passage: z
        .array(z.string())
        .min(1, 'Cần ít nhất một đoạn passage'),
    instruction: z.string(),
    statements: z
        .array(DraftStatementSchema)
        .min(1, 'Cần ít nhất một statement')
        .max(40, 'Tối đa 40 statements'),
});

export const AcademicTask1ChartContentSchema = z.object({
    questionType: z.literal('academic_task_1_chart'),
    prompt: z.string().trim().min(1, 'Prompt là bắt buộc'),
    instruction: z.string().trim().min(1, 'Instruction là bắt buộc'),
    imageAssetId: z.string().trim().min(1, 'Image asset là bắt buộc'),
    imageAlt: z.string().trim().min(1, 'Image alt text là bắt buộc'),
    minWords: z.literal(150, { message: 'minWords phải là 150 trong MVP' }),
    gradingRubricVersion: z.string().trim().optional(),
});

export const AiConversationContentSchema = z.object({
    questionType: z.literal('ai_conversation'),
    scenarioTitle: z.string().trim().min(1, 'Scenario title là bắt buộc'),
    context: z.string().trim().min(1, 'Context là bắt buộc'),
    openingPrompt: z.string().trim().min(1, 'Opening prompt là bắt buộc'),
    expectedDurationMinutes: z.number().int().positive('Duration phải > 0'),
    voice: z.string().trim().min(1, 'Voice là bắt buộc'),
    gradingRubricVersion: z.string().trim().optional(),
});

// ─── Discriminated union ─────────────────────────────────────────────────────

export const IeltsPracticeContentSchema = z.discriminatedUnion('questionType', [
    FormCompletionContentSchema,
    TrueFalseNotGivenContentSchema,
    AcademicTask1ChartContentSchema,
    AiConversationContentSchema,
]);

export const DraftIeltsPracticeContentSchema = z.discriminatedUnion('questionType', [
    DraftFormCompletionContentSchema,
    DraftTrueFalseNotGivenContentSchema,
    AcademicTask1ChartContentSchema,
    AiConversationContentSchema,
]);

// ─── Infer types ─────────────────────────────────────────────────────────────

export type FormCompletionContent = z.infer<typeof FormCompletionContentSchema>;
export type DraftFormCompletionContent = z.infer<typeof DraftFormCompletionContentSchema>;
export type TrueFalseNotGivenContent = z.infer<typeof TrueFalseNotGivenContentSchema>;
export type DraftTrueFalseNotGivenContent = z.infer<typeof DraftTrueFalseNotGivenContentSchema>;
export type AcademicTask1ChartContent = z.infer<typeof AcademicTask1ChartContentSchema>;
export type AiConversationContent = z.infer<typeof AiConversationContentSchema>;
export type IeltsPracticeContent = z.infer<typeof IeltsPracticeContentSchema>;
export type DraftIeltsPracticeContent = z.infer<typeof DraftIeltsPracticeContentSchema>;
