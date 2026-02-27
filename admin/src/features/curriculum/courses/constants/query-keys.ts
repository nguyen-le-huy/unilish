import type { CourseListQuery } from '../types/course.types';

// ─── Course ───────────────────────────────────────────────────────────────────

export const COURSE_QUERY_KEYS = {
    all: ['courses'] as const,
    lists: () => [...COURSE_QUERY_KEYS.all, 'list'] as const,
    list: (query: CourseListQuery) => [...COURSE_QUERY_KEYS.lists(), query] as const,
    details: () => [...COURSE_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...COURSE_QUERY_KEYS.details(), id] as const,
    trees: () => [...COURSE_QUERY_KEYS.all, 'tree'] as const,
    tree: (id: string) => [...COURSE_QUERY_KEYS.trees(), id] as const,
};

// ─── Unit ─────────────────────────────────────────────────────────────────────

export const UNIT_QUERY_KEYS = {
    all: ['units'] as const,
    lists: () => [...UNIT_QUERY_KEYS.all, 'list'] as const,
    list: (courseId: string) => [...UNIT_QUERY_KEYS.lists(), courseId] as const,
    details: () => [...UNIT_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...UNIT_QUERY_KEYS.details(), id] as const,
};

// ─── Lesson ───────────────────────────────────────────────────────────────────

export const LESSON_QUERY_KEYS = {
    all: ['lessons'] as const,
    lists: () => [...LESSON_QUERY_KEYS.all, 'list'] as const,
    list: (unitId: string) => [...LESSON_QUERY_KEYS.lists(), unitId] as const,
    details: () => [...LESSON_QUERY_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...LESSON_QUERY_KEYS.details(), id] as const,
    vocabContent: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'vocab-content', lessonId] as const,
    vocabStatus: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'vocab-status', lessonId] as const,
    vocabQuestions: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'vocab-questions', lessonId] as const,
    grammarContent: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'grammar-content', lessonId] as const,
    grammarQuestions: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'grammar-questions', lessonId] as const,
    readingContent: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'reading-content', lessonId] as const,
    readingQuestions: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'reading-questions', lessonId] as const,
    listeningContent: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'listening-content', lessonId] as const,
    listeningSyncStatus: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'listening-sync-status', lessonId] as const,
    listeningQuestions: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'listening-questions', lessonId] as const,
    speakingContent: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'speaking-content', lessonId] as const,
    writingContent: (lessonId: string) => [...LESSON_QUERY_KEYS.all, 'writing-content', lessonId] as const,
};
