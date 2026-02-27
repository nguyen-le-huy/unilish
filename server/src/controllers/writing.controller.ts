import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { WritingService } from '../services/writing.service.js';
import type {
    SaveWritingContentBody,
    GenerateWritingMissionBody,
    TestDriveGradeBody,
} from '../validations/writing.validation.js';

// ─── GET /:lessonId/writing/content ──────────────────────────────────────────

export const getWritingContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const content = await WritingService.getContent(lessonId);
    sendResponse(res, HttpStatus.OK, 'Writing content retrieved', content);
});

// ─── PUT /:lessonId/writing/content ──────────────────────────────────────────

export const saveWritingContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as SaveWritingContentBody;
    const content = await WritingService.saveContent(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Writing content saved', content);
});

// ─── POST /:lessonId/writing/generate ────────────────────────────────────────

export const generateWritingMission = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateWritingMissionBody;
    const result = await WritingService.generateMission(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Writing content generated', result);
});

export const testDriveGrade = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as TestDriveGradeBody;
    const result = await WritingService.testDriveGrade(lessonId, body.submission);
    sendResponse(res, HttpStatus.OK, 'Writing test-drive graded', result);
});
