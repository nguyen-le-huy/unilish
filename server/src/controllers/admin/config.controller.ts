import { type Request, type Response, type NextFunction } from 'express';
import { ConfigService } from '../../services/config.service.js';
import { catchAsync } from '../../utils/catch-async.js';
import { sendResponse } from '../../utils/send-response.js';

export class ConfigController {
    static getSubscriptionConfig = catchAsync(async (req: Request, res: Response) => {
        const config = await ConfigService.getSubscriptionConfig();
        sendResponse(res, 200, 'Subscription configuration retrieved', config);
    });

    static updateSubscriptionConfig = catchAsync(async (req: Request, res: Response) => {
        const newConfig = req.body;
        // Ideally validate with Zod here
        const config = await ConfigService.updateSubscriptionConfig(newConfig);
        sendResponse(res, 200, 'Subscription configuration updated', config);
    });

    static refreshCache = catchAsync(async (req: Request, res: Response) => {
        await ConfigService.refreshConfig();
        sendResponse(res, 200, 'Cache refreshed successfully');
    });

    static saveDraft = catchAsync(async (req: Request, res: Response) => {
        const newConfig = req.body;
        const actorId = (req as any).user._id;
        const config = await ConfigService.saveDraft(newConfig, actorId);
        sendResponse(res, 200, 'Draft saved successfully', config);
    });

    static getDraft = catchAsync(async (req: Request, res: Response) => {
        const draft = await ConfigService.getDraft();
        sendResponse(res, 200, 'Draft retrieved', draft);
    });

    static publishConfig = catchAsync(async (req: Request, res: Response) => {
        const actorId = (req as any).user._id;
        const config = await ConfigService.publishConfig(actorId);
        sendResponse(res, 200, 'Configuration published successfully', config);
    });

    static getHistory = catchAsync(async (req: Request, res: Response) => {
        const history = await ConfigService.getHistory();
        sendResponse(res, 200, 'History retrieved', history);
    });

    static getSubscriptionStats = catchAsync(async (req: Request, res: Response) => {
        const stats = await ConfigService.getSubscriptionStats();
        sendResponse(res, 200, 'Subscription statistics retrieved', stats);
    });
}
