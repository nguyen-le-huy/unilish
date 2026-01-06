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

    static getUsers = catchAsync(async (req: Request, res: Response) => {
        const result = await UserService.getUsers(req.query as any);
        sendResponse(res, HttpStatus.OK, 'Lấy danh sách người dùng thành công', result.users, result.pagination);
    });

    static getUserStats = catchAsync(async (req: Request, res: Response) => {
        const stats = await UserService.getUserStats();
        sendResponse(res, HttpStatus.OK, 'Lấy thống kê thành công', stats);
    });

    static getUserById = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const user = await UserService.getUserById(id as string);
        sendResponse(res, HttpStatus.OK, 'Lấy thông tin người dùng thành công', user);
    });

    static updateSubscription = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const user = await UserService.updateSubscription(id as string, req.body);
        sendResponse(res, HttpStatus.OK, 'Cập nhật gói cước thành công', user);
    });

    static updateRole = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        const user = await UserService.updateRole(id as string, req.body.role);
        sendResponse(res, HttpStatus.OK, 'Cập nhật quyền thành công', user);
    });
}
