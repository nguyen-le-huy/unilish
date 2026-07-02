import { User, type IUser } from '../../models/mongo/user.model.js';
import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import mongoose from 'mongoose';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecommendationProfile {
    _id: unknown;
    learningLanguageId: unknown;
    learningGoalId: unknown;
    currentLevel: string;
}

export interface UserListQuery {
    page?: string | undefined;
    limit?: string | undefined;
    search?: string | undefined;
    level?: string | undefined;
    role?: string | undefined;
}

export interface UserListResult {
    users: IUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface UserStats {
    totalUsers: number;
    newUsersToday: number;
    activeLearners: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class UserMongoRepository extends BaseMongoRepository<IUser> {
    constructor() {
        super(User);
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return this.model
            .findOne({ email })
            .lean()
            .exec() as Promise<IUser | null>;
    }

    async findByEmailWithPassword(email: string): Promise<IUser | null> {
        return this.model
            .findOne({ email })
            .select('+password')
            .lean()
            .exec() as Promise<IUser | null>;
    }

    async findByEmailWithOTP(email: string): Promise<IUser | null> {
        return this.model
            .findOne({ email })
            .select('+otp +otpExpires')
            .lean()
            .exec() as Promise<IUser | null>;
    }

    async findByGoogleIdOrEmail(googleId: string, email: string): Promise<IUser | null> {
        return this.model
            .findOne({
                $or: [{ googleId }, { email }]
            })
            .lean()
            .exec() as Promise<IUser | null>;
    }

    async findRecommendationProfileById(userId: string): Promise<UserRecommendationProfile | null> {
        return this.model
            .findById(userId)
            .select('_id learningLanguageId learningGoalId currentLevel')
            .lean()
            .exec() as Promise<UserRecommendationProfile | null>;
    }

    async findAllWithPagination(query: UserListQuery): Promise<UserListResult> {
        const { page = '1', limit = '10', search, level, role } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const filter: Record<string, unknown> = {};

        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
            ];
        }

        if (level) filter.currentLevel = level;
        if (role) filter.role = role;

        const [users, total] = await Promise.all([
            this.model.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .select('-password -__v')
                .lean(),
            this.model.countDocuments(filter),
        ]);

        return {
            users: users as IUser[],
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async getStats(): Promise<UserStats> {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [totalUsers, newUsersToday, activeLearners] = await Promise.all([
            this.model.countDocuments({}),
            this.model.countDocuments({
                createdAt: { $gte: startOfToday },
            }),
            this.model.countDocuments({
                lastActiveAt: { $gte: twentyFourHoursAgo },
            }),
        ]);

        return {
            totalUsers,
            newUsersToday,
            activeLearners,
        };
    }
}
