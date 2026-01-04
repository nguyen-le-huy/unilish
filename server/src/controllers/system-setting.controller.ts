import type { Request, Response } from 'express';
import { SystemSettingService } from '../services/system-setting.service.js';
import { sendResponse } from '../utils/send-response.js';
import { catchAsync } from '../utils/catch-async.js';
import { HttpStatus } from '../constants/http-status.js';

export const getSetting = catchAsync(async (req: Request, res: Response) => {
    const key = req.params.key as string;
    const value = await SystemSettingService.getSetting(key);

    sendResponse(res, HttpStatus.OK, 'Get setting successfully', { key, value });
});

export const updateSetting = catchAsync(async (req: Request, res: Response) => {
    const key = req.params.key as string;
    const { value, description } = req.body;

    const setting = await SystemSettingService.updateSetting(key, value, description);

    sendResponse(res, HttpStatus.OK, 'Update setting successfully', setting);
});

export const getAllSettings = catchAsync(async (req: Request, res: Response) => {
    const settings = await SystemSettingService.getAllSettings();
    sendResponse(res, HttpStatus.OK, 'Get all settings successfully', settings);
});
