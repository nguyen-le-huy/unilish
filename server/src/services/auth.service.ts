import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import redisClient from '../config/redis.js';
import type {
    RegisterInput,
    LoginInput
} from '../validations/auth.validation.js';
import type { IUser } from '../models/mongo/user.model.js';
import { EUserRole, EAuthProvider, ELevel, ESubscriptionPlan } from '../models/mongo/user.model.js';
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
    subscription: IUser['subscription'];
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
    private static readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

    constructor(
        private readonly userService: UserService,
        private readonly otpService: OtpService,
    ) { }

    private generateOtp(): string {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    private calculateOtpExpiry(): Date {
        return new Date(Date.now() + 10 * 60 * 1000);
    }

    private getOtpCacheKey(email: string): string {
        return `auth:otp:${email.toLowerCase()}`;
    }

    private async setOtpCache(email: string, hashedOtp: string, otpExpires: Date): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        const ttlSeconds = Math.max(1, Math.floor((otpExpires.getTime() - Date.now()) / 1000));

        try {
            await redisClient.setEx(this.getOtpCacheKey(email), ttlSeconds, hashedOtp);
        } catch (error) {
            logger.warn('Set OTP cache failed', { email, error });
        }
    }

    private async getOtpCache(email: string): Promise<string | null> {
        if (!redisClient.isOpen) {
            return null;
        }

        try {
            return await redisClient.get(this.getOtpCacheKey(email));
        } catch (error) {
            logger.warn('Get OTP cache failed', { email, error });
            return null;
        }
    }

    private async deleteOtpCache(email: string): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            await redisClient.del(this.getOtpCacheKey(email));
        } catch (error) {
            logger.warn('Delete OTP cache failed', { email, error });
        }
    }

    private getRefreshTokenCacheKey(userId: string): string {
        return `refreshToken:${userId}`;
    }

    private async whitelistRefreshToken(userId: string, refreshToken: string): Promise<void> {
        if (!redisClient.isOpen) {
            return;
        }

        try {
            await redisClient.setEx(
                this.getRefreshTokenCacheKey(userId),
                AuthService.REFRESH_TOKEN_TTL_SECONDS,
                refreshToken,
            );
        } catch (error) {
            logger.warn('Set refresh token whitelist failed', { userId, error });
        }
    }

    private getUserId(rawId: unknown): string {
        if (typeof rawId === 'string') {
            return rawId;
        }

        if (rawId && typeof rawId === 'object' && 'toString' in rawId) {
            return (rawId as { toString: () => string }).toString();
        }

        throw new AppError('User ID không hợp lệ', 500);
    }

    async register(input: RegisterInput) {
        const { email, password, fullName } = input;

        // Check if user exists
        const emailExists = await this.userService.checkEmailExists(email);
        if (emailExists) {
            throw new AppError('Email đã được sử dụng', 409);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

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
            subscription: {
                plan: ESubscriptionPlan.FREE,
                renewalType: null,
                startDate: null,
                endDate: null,
                status: 'active',
                lastTransactionId: null,
            },
        } as Partial<IUser>);

        // Optional cache branch in sequence diagram
        await this.setOtpCache(email, hashedOtp, otpExpires);

        // AuthService -> OTP Service -> Email Service
        await this.otpService.sendVerificationCode(email, otp, fullName);

        return {
            status: 'success',
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhập mã xác thực.',
            email: email, // Use input email directly
        };
    }

    async verifyOTP(email: string, otp: string) {
        // Find user by email first (sequence: existence -> verification state -> OTP validation)
        const existingUser = await this.userService.findByEmail(email);

        if (!existingUser) {
            throw new AppError('Không tìm thấy tài khoản', 404);
        }

        if (existingUser.isVerified) {
            throw new AppError('Tài khoản đã được xác thực', 400);
        }

        // Retrieve OTP fields for validation
        const userWithOtp = await this.userService.findByEmailWithOTP(email);

        if (!userWithOtp || !userWithOtp.otp || !userWithOtp.otpExpires) {
            throw new AppError('Mã xác thực không đúng hoặc đã hết hạn', 400);
        }

        if (new Date(userWithOtp.otpExpires).getTime() < Date.now()) {
            throw new AppError('Mã xác thực không đúng hoặc đã hết hạn', 400);
        }

        // Optional cache branch in sequence diagram
        const cachedHashedOtp = await this.getOtpCache(email);
        const sourceHashedOtp = cachedHashedOtp ?? userWithOtp.otp;

        const isMatch = await bcrypt.compare(otp, sourceHashedOtp);
        if (!isMatch) {
            throw new AppError('Mã xác thực không đúng hoặc đã hết hạn', 400);
        }

        const userId = this.getUserId(existingUser._id);

        // Mark user as verified and clear OTP fields
        await this.userService.markVerified(userId);

        // Optional cache clean up in sequence diagram
        await this.deleteOtpCache(email);

        const accessToken = this.signAccessToken(userId, existingUser.role);
        const refreshToken = this.signRefreshToken(userId);
        await this.whitelistRefreshToken(userId, refreshToken);
        const verifiedUser = await this.userService.findByEmail(email);

        const userResponse = verifiedUser ?? {
            ...existingUser,
            isVerified: true,
        };

        return {
            message: 'Xác thực thành công',
            accessToken,
            refreshToken,
            user: {
                _id: userResponse._id,
                email: userResponse.email,
                fullName: userResponse.fullName,
                avatarUrl: userResponse.avatarUrl,
                role: userResponse.role,
                learningLanguageId: userResponse.learningLanguageId,
                currentLevel: userResponse.currentLevel,
                learningGoalId: userResponse.learningGoalId,
                placementTestScore: userResponse.placementTestScore,
                subscription: userResponse.subscription,
            }
        };
    }

    async login(input: LoginInput) {
        const { email, password } = input;

        // Find user
        const user = await this.userService.findByEmailWithPassword(email);
        if (!user || !user.password) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        const userId = this.getUserId(user._id);

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        // Check verification
        if (!user.isVerified) {
            // Regenerate OTP
            const otp = this.generateOtp();
            const hashedOtp = await bcrypt.hash(otp, 10);
            const otpExpires = this.calculateOtpExpiry();

            await this.userService.updateUser(userId, {
                otp: hashedOtp,
                otpExpires
            });

            await this.setOtpCache(email, hashedOtp, otpExpires);

            // Resend Email
            this.otpService.sendVerificationCode(email, otp, user.fullName)
                .catch(err => logger.error('Error sending OTP:', err));

            throw new AppError('Tài khoản chưa xác thực. Mã OTP mới đã được gửi đến email của bạn.', 403);
        }

        // Update last active
        await this.userService.updateUser(userId, {
            lastActiveAt: new Date()
        });

        // Generate dual tokens
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
                subscription: user.subscription,
                dateOfBirth: user.dateOfBirth,
            },
            accessToken,
            refreshToken,
        };
    }

    async refreshAccessToken(rawRefreshToken: string): Promise<{ accessToken: string }> {
        // 1. Verify the refresh token signature & expiry
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        if (!secret) throw new AppError('JWT secret is not defined', 500);

        let payload: { id: string };
        try {
            payload = jwt.verify(rawRefreshToken, secret) as { id: string };
        } catch {
            throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
        }

        const userId = payload.id;

        // 2. Check whitelist in Redis (if Redis is available)
        if (redisClient.isOpen) {
            try {
                const stored = await redisClient.get(this.getRefreshTokenCacheKey(userId));
                if (!stored || stored !== rawRefreshToken) {
                    throw new AppError('Refresh token đã bị thu hồi', 401);
                }
            } catch (err) {
                if (err instanceof AppError) throw err;
                logger.warn('Redis whitelist check failed, falling back to JWT-only validation', { userId });
            }
        }

        // 3. Ensure user still exists
        const user = await this.userService.findById(userId);
        if (!user) throw new AppError('Tài khoản không tồn tại', 401);

        // 4. Issue new accessToken
        const accessToken = this.signAccessToken(userId, user.role);
        return { accessToken };
    }

    private signAccessToken(userId: string, role: string) {
        if (!process.env.JWT_SECRET) {
            throw new AppError('JWT_SECRET is not defined', 500);
        }
        return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
            expiresIn: '15m',
        } as jwt.SignOptions);
    }

    private signRefreshToken(userId: string) {
        const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            throw new AppError('JWT secret is not defined', 500);
        }
        return jwt.sign({ id: userId }, secret, {
            expiresIn: '7d',
        } as jwt.SignOptions);
    }

    async findOrCreateFromGoogle(profile: GoogleProfileInput): Promise<GoogleAuthResult> {
        const { googleId, email, fullName, avatarUrl, emailVerified } = profile;

        if (!emailVerified) {
            throw new AppError('Email Google chưa được xác minh', 400);
        }

        // Find user by googleId or email
        let user = await this.userService.findByGoogleIdOrEmail(googleId, email);
        let isNewUser = false;

        if (user) {
            const isLocalAccount = user.authProvider === EAuthProvider.LOCAL;

            const updates: Partial<IUser> = {
                googleId,
                avatarUrl,
                lastActiveAt: new Date(),
                isVerified: true,
            };

            if (!isLocalAccount) {
                updates.authProvider = EAuthProvider.GOOGLE;
                updates.fullName = fullName;
            }

            const updatedUser = await this.userService.updateUser(this.getUserId(user._id), updates);
            if (!updatedUser) {
                throw new AppError('Failed to update existing Google user', 500);
            }
            user = updatedUser;
        } else {
            isNewUser = true;

            user = await this.userService.createUser({
                googleId,
                email,
                fullName,
                avatarUrl: avatarUrl || null,
                authProvider: EAuthProvider.GOOGLE,
                isVerified: true,
                role: EUserRole.STUDENT,
                currentLevel: ELevel.A0,
                learningGoalId: null,
                learningLanguageId: null,
                lastActiveAt: new Date(),
                subscription: {
                    plan: ESubscriptionPlan.FREE,
                    renewalType: null,
                    startDate: null,
                    endDate: null,
                    status: 'active',
                    lastTransactionId: null,
                },
            } as Partial<IUser>);
        }

        if (!user) {
            throw new AppError('Failed to process Google login', 500);
        }

        // Generate dual tokens
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
                subscription: user.subscription,
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
