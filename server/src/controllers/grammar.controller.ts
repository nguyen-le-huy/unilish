import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { GrammarService } from '../services/grammar.service.js';
import type {
    SaveGrammarContentBody,
    GenerateGrammarStoryBody,
    GenerateGrammarQuestionsBody,
    UpdateGrammarQuestionBody,
} from '../validations/grammar.validation.js';

// ─── GET /lessons/:lessonId/grammar/content ───────────────────────────────────

export const getGrammarContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const content = await GrammarService.getContent(lessonId);
    sendResponse(res, HttpStatus.OK, 'Grammar content retrieved', content);
});

// ─── PUT /lessons/:lessonId/grammar/content ───────────────────────────────────

export const saveGrammarContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as SaveGrammarContentBody;
    const content = await GrammarService.saveContent(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Grammar content saved', content);
});

// ─── POST /lessons/:lessonId/grammar/generate-story ──────────────────────────

export const generateGrammarStory = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateGrammarStoryBody;
    const result = await GrammarService.generateStory(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Grammar story generated', result);
});

// ─── POST /lessons/:lessonId/grammar/generate-questions ──────────────────────

export const generateGrammarQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateGrammarQuestionsBody;
    const result = await GrammarService.generateQuestions(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Grammar questions generated', result);
});

// ─── POST /lessons/:lessonId/grammar/generate-audio ──────────────────────────

export const generateGrammarAudio = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    await GrammarService.generateAudio(lessonId);
    sendResponse(res, HttpStatus.OK, 'Đã đưa vào hàng đợi tạo âm thanh cho câu chuyện ngữ pháp', null);
});
// ─── GET /lessons/:lessonId/grammar/questions ───────────────────────────────────

export const getGrammarQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questions = await GrammarService.getQuestions(lessonId);
    sendResponse(res, HttpStatus.OK, 'Grammar questions retrieved', questions);
});

// ─── POST /lessons/:lessonId/grammar/questions/:questionId/swap ────────────────

export const swapGrammarQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;
    const replacement = await GrammarService.swapQuestion(lessonId, questionId);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được thay thế', replacement);
});

// ─── PUT /lessons/:lessonId/grammar/questions/:questionId ───────────────────────

export const updateGrammarQuestion = catchAsync(async (req: Request, res: Response) => {
    const questionId = req.params['questionId']!;
    const body = req.body as UpdateGrammarQuestionBody;
    const updated = await GrammarService.updateQuestion(questionId, body as Record<string, unknown>);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được cập nhật', updated);
});

// ─── DELETE /lessons/:lessonId/grammar/questions/:questionId ────────────────────

export const deleteGrammarQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;
    await GrammarService.deleteQuestion(lessonId, questionId);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được xoá', null);
});