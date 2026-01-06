import { User } from '../models/user.model.js';
import { z } from 'zod';
import type { updateProfileSchema, getUsersSchema, updateSubscriptionSchema } from '../validations/user.validation.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>['body'];

export class UserService {
    static async updateProfile(userId: string, data: UpdateProfileInput) {
        const user = await User.findByIdAndUpdate(userId, data, {
            new: true,
            runValidators: true
        }).lean();

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    static async getProfile(userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
        return user;
    }

    static async getUsers(query: GetUsersQuery) {
        const { page = '1', limit = '10', search, plan, level, role } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter: any = {};

        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } }
            ];
        }

        if (plan) filter['subscription.plan'] = plan;
        if (level) filter.currentLevel = level;
        if (role) filter.role = role;

        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .select('-password -__v')
                .lean(),
            User.countDocuments(filter)
        ]);

        return {
            users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        };
    }

    static async getUserStats() {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [totalUsers, premiumUsers, newUsersToday, activeLearners] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({
                'subscription.status': 'active',
                'subscription.plan': { $in: ['PLUS', 'PRO'] }
            }),
            User.countDocuments({
                createdAt: { $gte: startOfToday }
            }),
            User.countDocuments({
                'stats.lastActiveAt': { $gte: twentyFourHoursAgo }
            })
        ]);

        return {
            totalUsers,
            premiumUsers,
            newUsersToday,
            activeLearners
        };
    }

    static async updateSubscription(userId: string, data: UpdateSubscriptionInput) {
        const { plan, period } = data;
        const now = new Date();
        const endDate = new Date();

        if (period === 'monthly') {
            endDate.setDate(endDate.getDate() + 30);
        } else {
            endDate.setDate(endDate.getDate() + 365);
        }

        const user = await User.findByIdAndUpdate(
            userId,
            {
                'subscription.plan': plan,
                'subscription.startDate': now,
                'subscription.endDate': endDate,
                'subscription.status': 'active',
                'subscription.autoRenew': false
            },
            { new: true }
        ).lean();

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    static async updateRole(userId: string, role: string) {
        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).lean();

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    static async getUserById(userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
        return user;
    }
}
