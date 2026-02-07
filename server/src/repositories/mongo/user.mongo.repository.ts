import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { User } from '../../models/mongo/user.model.js';
import type { IUser } from '../../models/mongo/user.model.js';
import type { IUserRepository } from '../../interfaces/repositories/user.repository.interface.js';

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
}
