import axios from 'axios';
import { logger } from '../utils/logger.js';

export class EmailService {
    static async sendOTP(email: string, otp: string, name: string) {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        // Always log OTP in Dev mode for quick testing
        logger.info(`[EMAIL SERVICE] Sending OTP to ${email}: ${otp}`);

        // Development mode: Log OTP if no webhook
        if (!webhookUrl) {
            logger.debug(`[EMAIL DEV] No Webhook URL provided.`);
            return;
        }

        try {
            await axios.post(webhookUrl, {
                email,
                name,
                otp,
                subject: 'Unilish Verification Code',
                type: 'verify_email',
            });
        } catch (error) {
            logger.error('Failed to send email via n8n:', error);
        }
    }
}
