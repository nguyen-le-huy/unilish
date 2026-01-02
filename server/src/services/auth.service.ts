import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { EmailService } from './email.service.js';
import { z } from 'zod';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

// Type for Clerk user sync
interface ClerkUserInput {
    clerkId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
}

export class AuthService {
    static async register(input: RegisterInput) {
        const { email, password, fullName } = input;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new AppError('Email đã được sử dụng', 400);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            fullName,
            role: 'student',
            isVerified: false,
            otp: hashedOtp,
            otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            authProvider: 'local',
            currentLevel: 'A1',
            stats: {
                xp: 0,
                coins: 100, // Welcome bonus
                streak: 0,
                longestStreak: 0,
                lastActiveAt: new Date(),
            },
        } as any);

        // Send Email with OTP (Async to not block response)
        // Note: For production, use a queue (BullMQ/Redis)
        EmailService.sendOTP(email, otp, fullName).catch(err => console.error(err));

        return {
            status: 'success',
            message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhập mã xác thực.',
            email: user.email,
        };
    }

    static async verifyOTP(email: string, otp: string) {
        // Find user and select password/otp fields
        const user = await User.findOne({ email }).select('+otp +otpExpires');

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
        if (user.otpExpires < new Date()) {
            throw new AppError('Mã OTP đã hết hạn', 400);
        }

        // Check match
        const isMatch = await bcrypt.compare(otp, user.otp);
        if (!isMatch) {
            throw new AppError('Mã OTP không chính xác', 400);
        }

        // Verify success
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Login immediately
        const token = this.signToken((user._id as unknown) as string, user.role);

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
                stats: user.stats,
                subscription: user.subscription,
            }
        };
    }

    static async login(input: LoginInput) {
        const { email, password } = input;

        // Find user
        const user = await User.findOne({ email }).select('+password');
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
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedOtp = await bcrypt.hash(otp, 10);

            user.otp = hashedOtp;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
            await user.save();

            // Resend Email
            EmailService.sendOTP(email, otp, user.fullName).catch(err => console.error(err));

            throw new AppError('Tài khoản chưa xác thực. Mã OTP mới đã được gửi đến email của bạn.', 403);
        }

        // Update last active
        user.stats.lastActiveAt = new Date();
        await user.save();

        // Generate Token
        const token = this.signToken((user._id as unknown) as string, user.role);

        return {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                currentLevel: user.currentLevel,
                stats: user.stats,
                subscription: user.subscription,
            },
            token,
        };
    }

    private static signToken(userId: string, role: string) {
        const secret = process.env.JWT_SECRET || 'secret';
        const options: jwt.SignOptions = {
            expiresIn: (process.env.JWT_EXPIRY || '7d') as any,
        };
        return jwt.sign({ id: userId, role }, secret, options);
    }

    /**
     * Sync Clerk user data to MongoDB
     * Called after successful Clerk OAuth login
     * Creates new user if not exists, updates if exists
     */
    static async syncWithClerk(clerkUser: ClerkUserInput) {
        const { clerkId, email, fullName, avatarUrl } = clerkUser;

        // Find user by clerkId first, then by email
        let user = await User.findOne({
            $or: [{ clerkId }, { email }]
        });

        if (user) {
            // Update existing user with Clerk data
            user.clerkId = clerkId;
            user.fullName = fullName || user.fullName;
            user.avatarUrl = avatarUrl || user.avatarUrl;
            user.authProvider = 'google';
            user.isVerified = true;
            user.stats.lastActiveAt = new Date();
            await user.save();
        } else {
            // Create new user from Clerk data
            const userName: string = String(fullName || email.split('@')[0]);
            const userAvatar: string = String(avatarUrl || 'https://res.cloudinary.com/demo/image/upload/v1/default_avatar.png');

            user = await User.create({
                clerkId,
                email,
                fullName: userName,
                avatarUrl: userAvatar,
                authProvider: 'google' as const,
                isVerified: true,
                role: 'student' as const,
                currentLevel: 'A1' as const,
                stats: {
                    xp: 0,
                    coins: 100, // Welcome bonus
                    streak: 0,
                    longestStreak: 0,
                    lastActiveAt: new Date(),
                },
            } as any);
        }

        // Generate JWT token for API requests
        const token = this.signToken((user._id as unknown) as string, user.role);

        return {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                role: user.role,
                currentLevel: user.currentLevel,
                stats: user.stats,
                subscription: user.subscription,
            },
            token,
        };
    }
}
