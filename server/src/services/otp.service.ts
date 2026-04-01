import { EmailService } from './email.service.js';

export class OtpService {
    async sendVerificationCode(email: string, otp: string, fullName: string): Promise<void> {
        await EmailService.sendOTP(email, otp, fullName);
    }
}

export const otpService = new OtpService();
