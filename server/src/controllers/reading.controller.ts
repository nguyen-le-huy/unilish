import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { ReadingService } from '../services/reading.service.js';
import type {
    SaveReadingContentBody,
    GenerateReadingBody,
    GenerateReadingQuestionsBody,
    UpdateReadingQuestionBody,
} from '../validations/reading.validation.js';

// ─── GET /:lessonId/reading/content ──────────────────────────────────────────

export const getReadingContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const content = await ReadingService.getContent(lessonId);
    sendResponse(res, HttpStatus.OK, 'Reading content retrieved', content);
});

// ─── PUT /:lessonId/reading/content ──────────────────────────────────────────

export const saveReadingContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as SaveReadingContentBody;
    const content = await ReadingService.saveContent(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Reading content saved', content);
});

// ─── POST /:lessonId/reading/generate ────────────────────────────────────────

export const generateReadingContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateReadingBody;
    const result = await ReadingService.generateContent(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Reading content generated', result);
});

// ─── POST /:lessonId/reading/fill-glossary ───────────────────────────────────

export const fillGlossary = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const glossary = await ReadingService.fillGlossary(lessonId);
    sendResponse(res, HttpStatus.OK, 'Glossary filled', glossary);
});

// ─── POST /:lessonId/reading/generate-audio ──────────────────────────────────

export const generateReadingAudio = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    await ReadingService.generateAudio(lessonId);
    sendResponse(res, HttpStatus.OK, 'Đã đưa vào hàng đợi tạo âm thanh cho bài đọc', null);
});

// ─── POST /:lessonId/reading/generate-questions ──────────────────────────────

export const generateReadingQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateReadingQuestionsBody;
    const result = await ReadingService.generateQuestions(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Reading questions generated', result);
});

// ─── GET /:lessonId/reading/questions ────────────────────────────────────────

export const getReadingQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questions = await ReadingService.getQuestions(lessonId);
    sendResponse(res, HttpStatus.OK, 'Reading questions retrieved', questions);
});

// ─── POST /:lessonId/reading/questions/:questionId/swap ──────────────────────

export const swapReadingQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;
    const replacement = await ReadingService.swapQuestion(lessonId, questionId);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được thay thế', replacement);
});

// ─── PUT /:lessonId/reading/questions/:questionId ────────────────────────────

export const updateReadingQuestion = catchAsync(async (req: Request, res: Response) => {
    const questionId = req.params['questionId']!;
    const body = req.body as UpdateReadingQuestionBody;
    const updated = await ReadingService.updateQuestion(questionId, body as Record<string, unknown>);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được cập nhật', updated);
});

// ─── DELETE /:lessonId/reading/questions/:questionId ─────────────────────────

export const deleteReadingQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;
    await ReadingService.deleteQuestion(lessonId, questionId);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được xoá', null);
});
