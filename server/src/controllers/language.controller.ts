import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { languageService } from '../services/language.service.js';
import type {
    CreateLanguageBody,
    GetLanguagesQuery,
    TestLanguageVoiceBody,
    UpdateLanguageBody,
} from '../validations/language.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class LanguageController {
    static getLanguages = catchAsync(async (req: Request, res: Response) => {
        const languages = await languageService.getLanguages(req.query as unknown as GetLanguagesQuery);
        sendResponse(res, HttpStatus.OK, 'Get languages successfully', languages);
    });

    static getLanguageByCode = catchAsync(async (req: Request, res: Response) => {
        const code = req.params.code as string;
        const language = await languageService.getLanguageByCode(code);
        sendResponse(res, HttpStatus.OK, 'Get language successfully', language);
    });

    static createLanguage = catchAsync(async (req: Request, res: Response) => {
        const created = await languageService.createLanguage(req.body as CreateLanguageBody);
        sendResponse(res, HttpStatus.CREATED, 'Create language successfully', created);
    });

    static updateLanguage = catchAsync(async (req: Request, res: Response) => {
        const code = req.params.code as string;
        const updated = await languageService.updateLanguage(code, req.body as UpdateLanguageBody);
        sendResponse(res, HttpStatus.OK, 'Update language successfully', updated);
    });

    static toggleLanguageStatus = catchAsync(async (req: Request, res: Response) => {
        const code = req.params.code as string;
        const updated = await languageService.toggleLanguageStatus(code);
        sendResponse(res, HttpStatus.OK, 'Toggle language status successfully', updated);
    });

    static testLanguageVoice = catchAsync(async (req: Request, res: Response) => {
        const voiceData = await languageService.testVoice(req.body as TestLanguageVoiceBody);
        sendResponse(res, HttpStatus.OK, 'Test language voice successfully', voiceData);
    });
}
