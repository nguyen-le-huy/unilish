/**
 * Simple logger utility to replace console.log
 * Can be extended with Winston/Pino for production
 */

const isDev = process.env.NODE_ENV !== 'production';

const formatMessage = (level: string, message: string, meta?: unknown): string => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

export const logger = {
    info: (message: string, meta?: unknown) => {
        console.info(formatMessage('info', message, meta));
    },
    warn: (message: string, meta?: unknown) => {
        console.warn(formatMessage('warn', message, meta));
    },
    error: (message: string, meta?: unknown) => {
        console.error(formatMessage('error', message, meta));
    },
    debug: (message: string, meta?: unknown) => {
        if (isDev) {
            console.debug(formatMessage('debug', message, meta));
        }
    },
};
