import type { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';

export class UserController {
    static getProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;
        const user = await UserService.getProfile(userId);
        sendResponse(res, HttpStatus.OK, 'Lấy thông tin profile thành công', user);
    });

    static updateProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id;
        const user = await UserService.updateProfile(userId, req.body);
        sendResponse(res, HttpStatus.OK, 'Cập nhật profile thành công', user);
    });
}
