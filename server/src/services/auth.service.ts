import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/app-error.js';
import { EmailService } from './email.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type {
    RegisterInput,
    LoginInput
} from '../validations/auth.validation.js';
import type { IUserRepository } from '../interfaces/repositories/user.repository.interface.js';
import { UserMongoRepository } from '../repositories/mongo/user.mongo.repository.js';
import { UserGraphRepository } from '../repositories/neo4j/user.graph.repository.js';
import type { IUser } from '../models/mongo/user.model.js';
import { EUserRole, EAuthProvider, ELevel } from '../models/mongo/user.model.js';

export class AuthService {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly graphRepo: UserGraphRepository
    ) { }

    async register(input: RegisterInput) {
        const { email, password, fullName } = input;

        // Check if user exists
        const existingUser = await this.userRepo.findByEmail(email);
        if (existingUser) {
            throw new AppError('Email đã được sử dụng', 400);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Create user in MongoDB
        const newUser = await this.userRepo.create({
            email,
            password: hashedPassword,
            fullName,
            role: EUserRole.STUDENT,
            isVerified: false,
            otp: hashedOtp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            authProvider: EAuthProvider.LOCAL,
            currentLevel: ELevel.A1,
            lastActiveAt: new Date(),
        } as Partial<IUser>);

        // Sync to Neo4j (Best practice: wrap in try/catch to not block registration if graph fails, or use queue)
        // For now, we will log error but allow registration to succeed
        try {
            if (newUser && newUser._id) {
                await this.graphRepo.syncUser({
                    userId: newUser._id.toString(),
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: newUser.role,
                    currentLevel: newUser.currentLevel,
                    createdAt: new Date().toISOString(),
                    lastActiveAt: new Date().toISOString()
                });
            }
        } catch (error) {
            logger.error(`Failed to sync user to Neo4j during register: ${email}`, error);
            // Optional: revert mongo creation or push to retry queue
        }

        // Send Email with OTP (Async to not block response)
        EmailService.sendOTP(email, otp, fullName).catch(err => logger.error('Error sending OTP:', err));

        return {
            status: 'success',
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhập mã xác thực.',
            email: email, // Use input email directly
        };
    }

    async verifyOTP(email: string, otp: string) {
        // Find user and select password/otp fields
        const user = await this.userRepo.findByEmailWithOTP(email);

        if (!user) {
            throw new AppError('Email không tồn tại', 404);
        }

        if (user.isVerified) {
            throw new AppError('Tài khoản đã được xác thực', 400);
        }

        if (!user.otp || !user.otpExpires) {
            throw new AppError('Không tìm thấy mã OTP. Vui lòng gửi lại.', 400);
        }

        // Check expired
        // @ts-ignore
        if (new Date(user.otpExpires) < new Date()) {
            throw new AppError('Mã OTP đã hết hạn', 400);
        }

        // Check match
        // @ts-ignore
        const isMatch = await bcrypt.compare(otp, user.otp);
        if (!isMatch) {
            throw new AppError('Mã OTP không chính xác', 400);
        }

        // Verify success
        // @ts-ignore
        await this.userRepo.update(user._id as string, {
            isVerified: true,
            otp: undefined,
            otpExpires: undefined
        });

        // Login immediately
        // @ts-ignore
        const token = this.signToken(user._id as string, user.role);

        return {
            message: 'Xác thực thành công',
            token,
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                currentLevel: user.currentLevel,
                subscription: user.subscription,
            }
        };
    }

    async login(input: LoginInput) {
        const { email, password } = input;

        // Find user
        const user = await this.userRepo.findByEmailWithPassword(email);
        if (!user || !user.password) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError('Email hoặc mật khẩu không đúng', 401);
        }

        // Check verification
        if (!user.isVerified) {
            // Regenerate OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const hashedOtp = await bcrypt.hash(otp, 10);

            // @ts-ignore
            await this.userRepo.update(user._id as string, {
                otp: hashedOtp,
                otpExpires: new Date(Date.now() + 10 * 60 * 1000)
            });

            // Resend Email
            EmailService.sendOTP(email, otp, user.fullName).catch(err => logger.error('Error sending OTP:', err));

            throw new AppError('Tài khoản chưa xác thực. Mã OTP mới đã được gửi đến email của bạn.', 403);
        }

        // Update last active
        // @ts-ignore
        await this.userRepo.update(user._id as string, {
            lastActiveAt: new Date()
        } as any);

        // Generate Token
        // @ts-ignore
        const token = this.signToken(user._id as string, user.role);

        return {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                currentLevel: user.currentLevel,
                subscription: user.subscription,
                dateOfBirth: user.dateOfBirth,
            },
            token,
        };
    }

    private signToken(userId: string, role: string) {
        if (!process.env.JWT_SECRET) {
            throw new AppError('JWT_SECRET is not defined', 500);
        }
        return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        } as jwt.SignOptions);
    }

    async findOrCreateFromGoogle(profile: { googleId: string; email: string; fullName: string; avatarUrl: string }) {
        const { googleId, email, fullName, avatarUrl } = profile;

        // Find user by googleId or email
        let user = await this.userRepo.findByGoogleIdOrEmail(googleId, email);

        if (user) {
            // Update existing user (Account Linking)
            const updates: Partial<IUser> = {
                googleId: googleId,
                authProvider: EAuthProvider.GOOGLE,
                isVerified: true,
            };

            const updateObj: any = { ...updates };
            updateObj.lastActiveAt = new Date();

            // Only update avatar if default or not set
            if (!user.avatarUrl || user.avatarUrl.includes('default_avatar')) {
                updateObj.avatarUrl = avatarUrl;
            }

            try {
                await this.userRepo.update((user._id as unknown) as string, updateObj);
                // Re-fetch user to get updated fields if needed, or just patch the local object
                user = { ...user, ...updateObj };
            } catch (err) {
                logger.error('Failed to update user', err);
            }

        } else {
            // Create new user (using create method)
            user = await this.userRepo.create({
                googleId,
                email,
                fullName,
                avatarUrl: avatarUrl || 'https://res.cloudinary.com/demo/image/upload/v1/default_avatar.png',
                authProvider: EAuthProvider.GOOGLE,
                isVerified: true,
                role: EUserRole.STUDENT,
                currentLevel: ELevel.A1,
                lastActiveAt: new Date(),
            } as any);
        }

        if (!user) {
            throw new AppError('Failed to process Google login', 500);
        }

        // Sync to Neo4j
        try {
            await this.graphRepo.syncUser({
                userId: (user._id as unknown) as string,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                currentLevel: user.currentLevel,
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                // gender is optional, check if existing user has it
            });
        } catch (error) {
            logger.error(`Failed to sync Google user to Neo4j: ${email}`, error);
        }

        // Generate JWT token
        // @ts-ignore
        const token = this.signToken(user._id as string, user.role);

        return {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                currentLevel: user.currentLevel,
                subscription: user.subscription,
                phoneNumber: user.phoneNumber,
                dateOfBirth: user.dateOfBirth,
            },
            token,
        };
    }
}

export const authService = new AuthService(new UserMongoRepository(), new UserGraphRepository());
