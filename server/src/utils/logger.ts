import winston from 'winston';
import { env } from '../config/env.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

const customFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

export const logger = winston.createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: combine(timestamp(), json()),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp(),
                customFormat
            )
        }),
    ],
});

export const stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};
