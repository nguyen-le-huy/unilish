import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

const execFileAsync = promisify(execFile);
const YT_DLP_TIMEOUT_MS = 2 * 60 * 1000;
const YT_DLP_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

interface ExecFileError extends Error {
    stderr?: string;
    stdout?: string;
}

const isExecFileError = (value: unknown): value is ExecFileError => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return 'message' in value;
};

export class YtDlpService {
    static async extractAudio(videoId: string): Promise<string> {
        const targetPath = `/tmp/${videoId}.mp3`;
        const outputTemplate = `/tmp/${videoId}.%(ext)s`;
        const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;

        try {
            await execFileAsync('yt-dlp', [
                '--no-playlist',
                '--no-warnings',
                '-x',
                '--audio-format',
                'mp3',
                '--audio-quality',
                '64K',
                '-o',
                outputTemplate,
                sourceUrl,
            ], {
                timeout: YT_DLP_TIMEOUT_MS,
                maxBuffer: YT_DLP_MAX_BUFFER_BYTES,
            });

            logger.info('Shadowing audio extracted', { videoId, targetPath });
            return targetPath;
        } catch (error) {
            const errorText = isExecFileError(error)
                ? `${error.message} ${error.stderr ?? ''}`.toLowerCase()
                : '';

            if (errorText.includes('ffmpeg') || errorText.includes('avconv')) {
                logger.warn('yt-dlp mp3 extraction unavailable, fallback to direct audio download', { videoId });
                return this.downloadBestAudio(videoId, outputTemplate, sourceUrl);
            }

            logger.error('yt-dlp extraction failed', { videoId, error });
            throw new AppError('Could not extract audio from the provided video', HttpStatus.BAD_GATEWAY);
        }
    }

    private static async downloadBestAudio(
        videoId: string,
        outputTemplate: string,
        sourceUrl: string,
    ): Promise<string> {
        try {
            const { stdout } = await execFileAsync('yt-dlp', [
                '--no-playlist',
                '--no-warnings',
                '-f',
                'bestaudio',
                '--print',
                'after_move:filepath',
                '-o',
                outputTemplate,
                sourceUrl,
            ], {
                timeout: YT_DLP_TIMEOUT_MS,
                maxBuffer: YT_DLP_MAX_BUFFER_BYTES,
            });

            const filePath = stdout
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .at(-1);

            if (!filePath) {
                throw new AppError('Could not resolve downloaded audio file path', HttpStatus.BAD_GATEWAY);
            }

            logger.info('Shadowing audio downloaded without ffmpeg transcode', { videoId, filePath });
            return filePath;
        } catch (error) {
            logger.error('yt-dlp fallback download failed', { videoId, error });
            throw new AppError('Could not extract audio from the provided video', HttpStatus.BAD_GATEWAY);
        }
    }
}
