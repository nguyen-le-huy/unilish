import type { Request, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { AppError } from '../utils/app-error.js';

interface AzureSpeechTokenResponse {
    token: string;
    region: string;
    expiresInSeconds: number;
}

export const getAzureSpeechToken = catchAsync(async (_req: Request, res: Response) => {
    const tokenUrl = `https://${env.AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

    let token = '';

    try {
        const response = await axios.post<string>(tokenUrl, '', {
            headers: {
                'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 8000,
        });

        token = response.data;
    } catch {
        throw new AppError('Could not fetch Azure Speech token', HttpStatus.BAD_GATEWAY);
    }

    if (!token) {
        throw new AppError('Could not fetch Azure Speech token', HttpStatus.BAD_GATEWAY);
    }

    const payload: AzureSpeechTokenResponse = {
        token,
        region: env.AZURE_SPEECH_REGION,
        expiresInSeconds: 600,
    };

    res.status(HttpStatus.OK).json(payload);
});
