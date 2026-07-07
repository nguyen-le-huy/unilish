import { z } from 'zod';

const IeltsSkillSchema = z.enum(['listening', 'reading', 'writing', 'speaking']);

// ─── Summary ────────────────────────────────────────────────────────────────

export const ieltsSummarySchema = z.object({
    query: z.object({}).optional(),
});

// ─── List tests ─────────────────────────────────────────────────────────────

export const ieltsListTestsSchema = z.object({
    query: z.object({
        skill: IeltsSkillSchema,
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().trim().max(200).optional(),
    }),
});

// ─── Test detail by slug ────────────────────────────────────────────────────

export const ieltsTestDetailSchema = z.object({
    params: z.object({
        slug: z.string().trim().min(1).max(200),
    }),
});

// ─── Exported types ─────────────────────────────────────────────────────────

export type IeltsSummaryQuery = z.infer<typeof ieltsSummarySchema>['query'];
export type IeltsListTestsQuery = z.infer<typeof ieltsListTestsSchema>['query'];
export type IeltsTestDetailParams = z.infer<typeof ieltsTestDetailSchema>['params'];
