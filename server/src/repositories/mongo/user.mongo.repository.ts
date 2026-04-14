import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { User, ESubscriptionStatus, ESubscriptionPlan } from '../../models/mongo/user.model.js';
import type { IUser } from '../../models/mongo/user.model.js';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.js';

export interface UserRecommendationProfile {
    _id: IUser['_id'];
    learningLanguageId: IUser['learningLanguageId'];
    learningGoalId: IUser['learningGoalId'];
    currentLevel: IUser['currentLevel'];
}

export class UserMongoRepository extends BaseMongoRepository<IUser> implements IUserRepository {
    constructor() {
        super(User);
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return this.model.findOne({ email }).lean().exec() as Promise<IUser | null>;
    }

    async findByClerkId(clerkId: string): Promise<IUser | null> {
        return this.model.findOne({ clerkId }).lean().exec() as Promise<IUser | null>;
    }

    async findByEmailWithPassword(email: string): Promise<IUser | null> {
        return this.model.findOne({ email }).select('+password').lean().exec() as Promise<IUser | null>;
    }

    async findByEmailWithOTP(email: string): Promise<IUser | null> {
        return this.model.findOne({ email }).select('+otp +otpExpires').lean().exec() as Promise<IUser | null>;
    }
    async findByGoogleIdOrEmail(googleId: string, email: string): Promise<IUser | null> {
        return this.model.findOne({
            $or: [{ googleId }, { email }]
        }).lean().exec() as Promise<IUser | null>;
    }
    async findByClerkIdOrEmail(clerkId: string, email: string): Promise<IUser | null> {
        return this.model.findOne({
            $or: [{ clerkId }, { email }]
        }).lean().exec() as Promise<IUser | null>;
    }

    async findRecommendationProfileById(userId: string): Promise<UserRecommendationProfile | null> {
        return this.model
            .findById(userId)
            .select('_id learningLanguageId learningGoalId currentLevel')
            .lean()
            .exec() as Promise<UserRecommendationProfile | null>;
    }

    async findAllWithPagination(query: any): Promise<{ users: IUser[], pagination: any }> {
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
            this.model.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .select('-password -__v')
                .lean(),
            this.model.countDocuments(filter)
        ]);

        return {
            users: users as IUser[],
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        };
    }

    async getStats(): Promise<any> {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [totalUsers, premiumUsers, newUsersToday, activeLearners] = await Promise.all([
            this.model.countDocuments({}),
            this.model.countDocuments({
                'subscription.status': ESubscriptionStatus.ACTIVE,
                'subscription.plan': ESubscriptionPlan.PREMIUM
            }),
            this.model.countDocuments({
                createdAt: { $gte: startOfToday }
            }),
            this.model.countDocuments({
                lastActiveAt: { $gte: twentyFourHoursAgo }
            })
        ]);

        return {
            totalUsers,
            premiumUsers,
            newUsersToday,
            activeLearners
        };
    }
}
