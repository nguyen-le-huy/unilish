import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import redisClient from '../config/redis.js';
import type {
    RegisterInput,
    LoginInput,
} from '../validations/auth.validation.js';
import type { IUser } from '../models/mongo/user.model.js';
import { EUserRole, EAuthProvider, ELevel } from '../models/mongo/user.model.js';
import { userService, UserService } from './user.service.js';
import { otpService, OtpService } from './otp.service.js';

interface GoogleProfileInput {
    googleId: string;
    email: string;
    fullName: string;
    avatarUrl: string;
    emailVerified: boolean;
}

interface AuthenticatedUserResponse {
    _id: IUser['_id'];
    email: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
    learningLanguageId: IUser['learningLanguageId'];
    currentLevel: IUser['currentLevel'];
    learningGoalId: IUser['learningGoalId'];
    placementTestScore: number;
    phoneNumber: string | undefined;
    dateOfBirth: Date | undefined;
}

export interface GoogleAuthResult {
    user: AuthenticatedUserResponse;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
}

export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly otpService: OtpService,
    ) {}

    private getUserId(userId: IUser['_id']): string {
        return userId.toString();
    }

    private signAccessToken(userId: string, role: string): string {
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        return jwt.sign({ id: userId, role }, secret, { expiresIn } as jwt.SignOptions);
    }

    private signRefreshToken(userId: string): string {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback-secret';
        return jwt.sign({ id: userId, type: 'refresh' }, secret, { expiresIn: '30d' } as jwt.SignOptions);
    }

    private calculateOtpExpiry(): Date {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        return now;
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private async whitelistRefreshToken(userId: string, refreshToken: string): Promise<void> {
        if (!redisClient.isOpen) return;
        const key = `refresh:${userId}`;
        await redisClient.set(key, refreshToken, { EX: 30 * 24 * 60 * 60 });
    }

    private async setOtpCache(email: string, otp: string, expires: Date): Promise<void> {
        if (!redisClient.isOpen) return;
        const ttlSeconds = Math.max(60, Math.floor((expires.getTime() - Date.now()) / 1000));
        await redisClient.set(`otp:${email}`, otp, { EX: ttlSeconds });
    }

    async register(input: RegisterInput) {
        const { email, password, fullName } = input;

        // Check existing
        const existingUser = await this.userService.checkEmailExists(email);
        if (existingUser) {
            throw new AppError('Email đã được đăng ký', 400);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = this.generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = this.calculateOtpExpiry();

        // Create user in MongoDB
        await this.userService.createUser({
            email,
            password: hashedPassword,
            fullName,
            role: EUserRole.STUDENT,
            isVerified: false,
            otp: hashedOtp,
            otpExpires,
            authProvider: EAuthProvider.LOCAL,
            currentLevel: ELevel.A0,
            lastActiveAt: new Date(),
        } as Partial<IUser>);

        // Optional cache branch in sequence diagram
        await this.setOtpCache(email, hashedOtp, otpExpires);

        // AuthService -> OTP Service -> Email Service
        await this.otpService.sendVerificationCode(email, otp, fullName);

        return {
            status: 'success',
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhập mã xác thực.',
            email: email,
        };
    }

    async verifyOTP(email: string, otp: string) {
        const existingUser = await this.userService.findByEmail(email);

        if (!existingUser) {
            throw new AppError('Không tìm thấy tài khoản', 404);
        }

        if (existingUser.isVerified) {
            throw new AppError('Tài khoản đã được xác thực', 400);
        }

        const userWithOtp = await this.userService.findByEmailWithOTP(email);

        if (!userWithOtp || !userWithOtp.otp || !userWithOtp.otpExpires) {
            throw new AppError('Mã xác thực không đúng hoặc đã hết hạn', 400);
        }

        if (new Date() > userWithOtp.otpExpires) {
            throw new AppError('Mã xác thực đã hết hạn', 400);
        }

        const isOtpValid = await bcrypt.compare(otp, userWithOtp.otp);

        if (isOtpValid) {
            const userId = String(existingUser._id);
            await this.userService.markVerified(userId);
            const accessToken = this.signAccessToken(userId, existingUser.role);
            const refreshToken = this.signRefreshToken(userId);
            await this.whitelistRefreshToken(userId, refreshToken);
            return {
                user: {
                    _id: existingUser._id,
                    email: existingUser.email,
                    fullName: existingUser.fullName,
                    avatarUrl: existingUser.avatarUrl,
                    role: existingUser.role,
                    learningLanguageId: existingUser.learningLanguageId,
                    currentLevel: existingUser.currentLevel,
                    learningGoalId: existingUser.learningGoalId,
                    placementTestScore: existingUser.placementTestScore,
                    phoneNumber: existingUser.phoneNumber,
                    dateOfBirth: existingUser.dateOfBirth,
                },
                accessToken,
                refreshToken,
            };
        }

        throw new AppError('Mã xác thực không đúng', 400);
    }

    async resendOTP(email: string) {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new AppError('Không tìm thấy tài khoản', 404);
        }

        if (user.isVerified) {
            throw new AppError('Tài khoản đã được xác thực', 400);
        }

        const otp = this.generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const otpExpires = this.calculateOtpExpiry();

        await this.userService.updateUser(String(user._id), {
            otp: hashedOtp,
            otpExpires,
        });

        await this.setOtpCache(email, hashedOtp, otpExpires);
        await this.otpService.sendVerificationCode(email, otp, user.fullName);

        return {
            status: 'success',
            message: 'Mã xác thực mới đã được gửi đến email của bạn.',
        };
    }

    async login(input: LoginInput) {
        const { email, password } = input;

        const user = await this.userService.findByEmailWithPassword(email);
        if (!user || !user.password) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        const userId = this.getUserId(user._id);

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        if (!user.isVerified) {
            throw new AppError('Tài khoản chưa được xác thực. Vui lòng kiểm tra email.', 401);
        }

        const accessToken = this.signAccessToken(userId, user.role);
        const refreshToken = this.signRefreshToken(userId);
        await this.whitelistRefreshToken(userId, refreshToken);

        return {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                learningLanguageId: user.learningLanguageId,
                currentLevel: user.currentLevel,
                learningGoalId: user.learningGoalId,
                placementTestScore: user.placementTestScore,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth,
            },
            accessToken,
            refreshToken,
        };
    }

    async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        if (!secret) throw new AppError('JWT secret is not defined', 500);

        let decoded: { id: string; type?: string };
        try {
            decoded = jwt.verify(rawRefreshToken, secret) as { id: string; type?: string };
        } catch (error) {
            throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
        }

        if (decoded.type !== 'refresh') {
            throw new AppError('Invalid token type', 401);
        }

        const userId = decoded.id;
        if (!redisClient.isOpen) {
            throw new AppError('Service unavailable', 500);
        }

        const storedRefreshToken = await redisClient.get(`refresh:${userId}`);
        if (!storedRefreshToken || storedRefreshToken !== rawRefreshToken) {
            throw new AppError('Refresh token không hợp lệ hoặc đã bị thu hồi', 401);
        }

        const user = await this.userService.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const accessToken = this.signAccessToken(userId, user.role);
        return { accessToken };
    }

    async logout(userId: string): Promise<void> {
        if (!redisClient.isOpen) return;
        await redisClient.del(`refresh:${userId}`);
    }

    async handleGoogleLogin(profile: GoogleProfileInput): Promise<GoogleAuthResult> {
        const { googleId, email, fullName, avatarUrl, emailVerified } = profile;

        let user = await this.userService.findByGoogleIdOrEmail(googleId, email);
        let isNewUser = false;

        if (user && !user.googleId) {
            // Existing LOCAL user — link Google account
            user = await this.userService.updateUser(String(user._id), { googleId });
        } else if (!user) {
            // New user from Google
            isNewUser = true;
            user = await this.userService.createUser({
                email,
                fullName,
                avatarUrl,
                googleId,
                authProvider: EAuthProvider.GOOGLE,
                isVerified: true,
                role: EUserRole.STUDENT,
                currentLevel: ELevel.A0,
                learningGoalId: null,
                learningLanguageId: null,
                lastActiveAt: new Date(),
            } as Partial<IUser>);
        }

        if (!user) {
            throw new AppError('Failed to process Google login', 500);
        }

        const userId = this.getUserId(user._id);
        const accessToken = this.signAccessToken(userId, user.role);
        const refreshToken = this.signRefreshToken(userId);
        await this.whitelistRefreshToken(userId, refreshToken);

        return {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                learningLanguageId: user.learningLanguageId,
                currentLevel: user.currentLevel,
                learningGoalId: user.learningGoalId,
                placementTestScore: user.placementTestScore,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth,
            },
            accessToken,
            refreshToken,
            isNewUser,
        };
    }
}

export const authService = new AuthService(userService, otpService);
