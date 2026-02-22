import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { unitService } from '../services/unit.service.js';
import type { CreateUnitBody, ReorderUnitsBody, UpdateUnitBody } from '../validations/unit.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class UnitController {
    static getUnitsByCourseId = catchAsync(async (req: Request, res: Response) => {
        const units = await unitService.getUnitsByCourseId(req.query.courseId as string);
        sendResponse(res, HttpStatus.OK, 'Get units successfully', units);
    });

    static getUnitById = catchAsync(async (req: Request, res: Response) => {
        const unit = await unitService.getUnitById(req.params['unitId']!);
        sendResponse(res, HttpStatus.OK, 'Get unit successfully', unit);
    });

    static createUnit = catchAsync(async (req: Request, res: Response) => {
        const created = await unitService.createUnit(req.body as CreateUnitBody);
        sendResponse(res, HttpStatus.CREATED, 'Unit created successfully', created);
    });

    static updateUnit = catchAsync(async (req: Request, res: Response) => {
        const updated = await unitService.updateUnit(
            req.params['unitId']!,
            req.body as UpdateUnitBody,
        );
        sendResponse(res, HttpStatus.OK, 'Unit updated successfully', updated);
    });

    static deleteUnit = catchAsync(async (req: Request, res: Response) => {
        await unitService.deleteUnit(req.params['unitId']!);
        sendResponse(res, HttpStatus.NO_CONTENT, 'Unit deleted successfully', null);
    });

    static reorderUnits = catchAsync(async (req: Request, res: Response) => {
        await unitService.reorderUnits(req.body as ReorderUnitsBody);
        sendResponse(res, HttpStatus.OK, 'Units reordered successfully', null);
    });
}
