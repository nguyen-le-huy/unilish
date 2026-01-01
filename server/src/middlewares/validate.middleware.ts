import type { ZodSchema } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catch-async.js';

export const validate = (schema: ZodSchema) =>
    catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    });
