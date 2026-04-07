import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { placementSessionService } from '../services/placement-session.service.js';
import type {
    CreatePlacementSessionBody,
    PlacementSessionParams,
    StartWritingAttemptBody,
    SubmitSpeakingAttemptBody,
    SubmitWritingAttemptBody,
    UploadSpeakingAudioChunkBody,
} from '../validations/placement-session.validation.js';

export class PlacementSessionController {
    static createSession = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const body = req.body as CreatePlacementSessionBody;

        const result = await placementSessionService.createSession(userId, body);
        sendResponse(res, HttpStatus.CREATED, 'Create placement session successfully', result);
    });

    static startWritingAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;
        const body = req.body as StartWritingAttemptBody;

        const result = await placementSessionService.startWritingAttempt(userId, sessionId, body);
        sendResponse(res, HttpStatus.CREATED, 'Start writing attempt successfully', result);
    });

    static submitWritingAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;
        const body = req.body as SubmitWritingAttemptBody;

        const result = await placementSessionService.submitWritingAttempt(userId, sessionId, body);
        sendResponse(res, HttpStatus.ACCEPTED, 'Submit writing attempt successfully', result);
    });

    static getWritingResult = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;

        const result = await placementSessionService.getWritingResult(userId, sessionId);
        sendResponse(res, HttpStatus.OK, 'Get writing result successfully', result);
    });

    static startSpeakingAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;

        const result = await placementSessionService.startSpeakingAttempt(userId, sessionId);
        sendResponse(res, HttpStatus.CREATED, 'Start speaking attempt successfully', result);
    });

    static uploadSpeakingAudioChunk = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;
        const body = req.body as UploadSpeakingAudioChunkBody;

        const result = await placementSessionService.uploadSpeakingAudioChunk(userId, sessionId, body, req.file);
        sendResponse(res, HttpStatus.OK, 'Upload speaking audio chunk successfully', result);
    });

    static submitSpeakingAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;
        const body = req.body as SubmitSpeakingAttemptBody;

        const result = await placementSessionService.submitSpeakingAttempt(userId, sessionId, body);
        sendResponse(res, HttpStatus.ACCEPTED, 'Submit speaking attempt successfully', result);
    });

    static getSpeakingResult = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;

        const result = await placementSessionService.getSpeakingResult(userId, sessionId);
        sendResponse(res, HttpStatus.OK, 'Get speaking result successfully', result);
    });

    static getPlacementResult = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { sessionId } = req.params as unknown as PlacementSessionParams;

        const result = await placementSessionService.getPlacementResult(userId, sessionId);
        const statusCode = result.status === 'ready' ? HttpStatus.OK : HttpStatus.ACCEPTED;
        sendResponse(res, statusCode, 'Get placement result successfully', result);
    });
}
