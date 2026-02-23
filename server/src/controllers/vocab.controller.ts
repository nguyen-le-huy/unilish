import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { VocabGenerationService } from '../services/vocab-generation.service.js';
import { QuestionGenerationService } from '../services/question-generation.service.js';
import type {
    GenerateVocabBody,
    SaveVocabContentBody,
    RegenerateAudioBody,
    GenerateQuestionsBody,
    UpdateVocabQuestionBody,
} from '../validations/vocab-content.validation.js';

// ─── GET /lessons/:lessonId/vocab/content ─────────────────────────────────────

export const getVocabContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;

    const content = await VocabGenerationService.getVocabContent(lessonId);

    sendResponse(res, HttpStatus.OK, 'Vocab content retrieved', content);
});

// ─── PUT /lessons/:lessonId/vocab/content ─────────────────────────────────────

export const saveVocabContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as SaveVocabContentBody;

    const content = await VocabGenerationService.saveVocabContent(lessonId, body);

    sendResponse(res, HttpStatus.OK, 'Vocab content saved', content);
});

// ─── POST /lessons/:lessonId/vocab/generate-audio ────────────────────────────

export const generateAllAudio = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;

    await VocabGenerationService.generateAllAudio(lessonId);

    sendResponse(res, HttpStatus.OK, 'Đã đưa vào hàng đợi tạo âm thanh cho toàn bộ từ vựng', null);
});

// ─── POST /lessons/:lessonId/vocab/generate ───────────────────────────────────

export const generateVocabContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateVocabBody;

    const content = await VocabGenerationService.generateVocabContent(lessonId, body);

    sendResponse(res, HttpStatus.OK, 'Vocabulary generation started', content);
});

// ─── GET /lessons/:lessonId/vocab/status ─────────────────────────────────────

export const getGenerationStatus = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;

    const status = await VocabGenerationService.getGenerationStatus(lessonId);

    sendResponse(res, HttpStatus.OK, 'Generation status retrieved', status);
});

// ─── POST /lessons/:lessonId/vocab/items/:itemId/regenerate-audio ─────────────

export const regenerateItemAudio = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const itemId = req.params['itemId']!;
    const body = req.body as RegenerateAudioBody;

    await VocabGenerationService.regenerateItemAudio(lessonId, itemId, body);

    sendResponse(res, HttpStatus.OK, 'Audio regeneration enqueued', null);
});

// ─── GET /lessons/:lessonId/vocab/questions ────────────────────────────────────

export const getVocabQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;

    const questions = await QuestionGenerationService.getQuestionsForLesson(lessonId);

    sendResponse(res, HttpStatus.OK, 'Vocab questions retrieved', questions);
});

// ─── POST /lessons/:lessonId/vocab/generate-questions ────────────────────────

export const generateVocabQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const { distribution } = req.body as GenerateQuestionsBody;

    const questions = await QuestionGenerationService.generateQuestionsFromVocab(
        lessonId,
        distribution,
    );

    sendResponse(res, HttpStatus.CREATED, `Đã tạo ${questions.length} câu hỏi luyện tập`, questions);
});

// ─── POST /lessons/:lessonId/vocab/questions/:questionId/swap ─────────────────

export const swapVocabQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;

    const replacement = await QuestionGenerationService.swapQuestion(lessonId, questionId);

    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được thay thế', replacement);
});

// ─── PUT /lessons/:lessonId/vocab/questions/:questionId ───────────────────────

export const updateVocabQuestion = catchAsync(async (req: Request, res: Response) => {
    const questionId = req.params['questionId']!;
    const body = req.body as UpdateVocabQuestionBody;

    const updated = await QuestionGenerationService.updateQuestion(
        questionId,
        body as Record<string, unknown>,
    );

    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được cập nhật', updated);
});
