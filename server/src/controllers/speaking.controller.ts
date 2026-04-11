import type { Request, Response, NextFunction } from 'express';
import { speakingService } from '../services/speaking.service.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import type {
    GetSpeakingContentParams,
    GetSpeakingRealtimeSessionParams,
    SaveSpeakingContentBody,
    GenerateSpeakingMissionBody,
    TestSpeakingCoachBody,
} from '../validations/speaking.validation.js';

export const speakingController = {
    getSpeakingRealtimeSession: async (
        req: Request<GetSpeakingRealtimeSessionParams>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { lessonId } = req.params;
            const session = await speakingService.createRealtimeSession(lessonId);
            sendResponse(res, HttpStatus.OK, 'Speaking realtime session created successfully', session);
        } catch (error) {
            next(error);
        }
    },

    getSpeakingContent: async (
        req: Request<GetSpeakingContentParams>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { lessonId } = req.params;
            const content = await speakingService.getContent(lessonId);
            sendResponse(res, HttpStatus.OK, 'Speaking content fetched successfully', content);
        } catch (error) {
            next(error);
        }
    },

    saveSpeakingContent: async (
        req: Request<GetSpeakingContentParams, {}, SaveSpeakingContentBody>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { lessonId } = req.params;
            const payload = req.body;
            const content = await speakingService.saveContent(lessonId, payload);
            sendResponse(res, HttpStatus.OK, 'Speaking content saved successfully', content);
        } catch (error) {
            next(error);
        }
    },

    generateSpeakingMission: async (
        req: Request<GetSpeakingContentParams, {}, GenerateSpeakingMissionBody>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { lessonId } = req.params;
            const { topic, context } = req.body;
            const mission = await speakingService.generateMission(lessonId, topic, context);
            sendResponse(res, HttpStatus.OK, 'Speaking mission generated successfully', mission);
        } catch (error) {
            next(error);
        }
    },

    testSpeakingCoach: async (
        req: Request<GetSpeakingContentParams, {}, TestSpeakingCoachBody>,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const { lessonId } = req.params;
            const { userMessage } = req.body;
            const result = await speakingService.testCoach(lessonId, userMessage);
            sendResponse(res, HttpStatus.OK, 'Speaking coach test completed', result);
        } catch (error) {
            next(error);
        }
    },
};