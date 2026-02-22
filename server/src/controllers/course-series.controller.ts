import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { courseSeriesService } from '../services/course-series.service.js';
import type {
    CreateCourseSeriesBody,
    GetCourseSeriesListQuery,
    UpdateCourseSeriesBody,
} from '../validations/course-series.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class CourseSeriesController {
    static getSeriesList = catchAsync(async (req: Request, res: Response) => {
        const result = await courseSeriesService.getSeriesList(
            req.query as unknown as GetCourseSeriesListQuery,
        );
        sendResponse(res, HttpStatus.OK, 'Get course series list successfully', result.series, result.pagination);
    });

    static getSeriesBySlug = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        const series = await courseSeriesService.getSeriesBySlug(slug);
        sendResponse(res, HttpStatus.OK, 'Get course series successfully', series);
    });

    static createSeries = catchAsync(async (req: Request, res: Response) => {
        const created = await courseSeriesService.createSeries(req.body as CreateCourseSeriesBody);
        sendResponse(res, HttpStatus.CREATED, 'Create course series successfully', created);
    });

    static updateSeries = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        const updated = await courseSeriesService.updateSeries(
            slug,
            req.body as UpdateCourseSeriesBody,
        );
        sendResponse(res, HttpStatus.OK, 'Update course series successfully', updated);
    });

    static toggleStatus = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        const updated = await courseSeriesService.toggleSeriesStatus(slug);
        sendResponse(res, HttpStatus.OK, 'Toggle course series status successfully', updated);
    });

    static deleteSeries = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        await courseSeriesService.deleteSeries(slug);
        sendResponse(res, HttpStatus.NO_CONTENT, 'Delete course series successfully', null);
    });
}
