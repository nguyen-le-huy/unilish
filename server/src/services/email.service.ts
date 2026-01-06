import axios from 'axios';
import { logger } from '../utils/logger.js';

export class EmailService {
    static async sendOTP(email: string, otp: string, name: string) {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        // Development mode: Log OTP if no webhook
        if (!webhookUrl) {
            logger.debug(`[EMAIL DEV] OTP for ${email}: ${otp}`);
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
