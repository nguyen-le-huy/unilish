import { User, ESubscriptionStatus, ESubscriptionPlan } from '../models/mongo/user.model.js';
import { z } from 'zod';
import type { updateProfileSchema, getUsersSchema, updateSubscriptionSchema } from '../validations/user.validation.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { UserMongoRepository } from '../repositories/mongo/user.mongo.repository.js';
import { UserGraphRepository } from '../repositories/neo4j/user.graph.repository.js';
import { logger } from '../utils/logger.js';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>['body'];

export class UserService {
    constructor(
        private readonly userRepo: UserMongoRepository,
        private readonly graphRepo: UserGraphRepository
    ) { }

    async updateProfile(userId: string, data: UpdateProfileInput) {
        // Use Model directly if specific options like runValidators are needed, 
        // OR rely on Zod and use repo.update(). 
        // Here we stick to repo.update for consistency, assuming Zod handles validation.
        // If strictly need runValidators, we can use this.userRepo.model (as it is protected/public depending on implementation, usually protected so technically not accessible unless getter used? BaseMongoRepository defines protected model. So subclasses can access it. But UserService is not a subclass.
        // BUT, we can just use the update method of the repo.
        const user = await this.userRepo.update(userId, data);

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        // Sync to Neo4j
        try {
            // @ts-ignore
            await this.graphRepo.syncUser({
                userId: user._id.toString(),
                email: user.email,
                fullName: user.fullName,
                gender: user.gender,
                // other fields that might have changed
            });
        } catch (error) {
            logger.error(`[Neo4j] Failed to sync user update for ${userId}`, error);
        }

        return user;
    }

    async getProfile(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
        return user;
    }

    async getUsers(query: GetUsersQuery) {
        return this.userRepo.findAllWithPagination(query);
    }

    async getUserStats() {
        return this.userRepo.getStats();
    }

    async updateSubscription(userId: string, data: UpdateSubscriptionInput) {
        const { plan, period } = data;
        const now = new Date();
        const endDate = new Date();

        if (period === 'monthly') {
            endDate.setDate(endDate.getDate() + 30);
        } else {
            endDate.setDate(endDate.getDate() + 365);
        }

        const user = await this.userRepo.update(userId, {
            'subscription.plan': plan,
            'subscription.startDate': now,
            'subscription.endDate': endDate,
            'subscription.status': ESubscriptionStatus.ACTIVE,
            'subscription.autoRenew': false
        });

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    async updateRole(userId: string, role: string) {
        const user = await this.userRepo.update(userId, { role });

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        // Sync to Neo4j
        try {
            // @ts-ignore
            await this.graphRepo.syncUser({
                userId: user._id.toString(),
                role: user.role
            });
        } catch (error) {
            logger.error(`[Neo4j] Failed to sync role update for ${userId}`, error);
        }

        return user;
    }

    async updateLevel(userId: string, level: string) {
        const user = await this.userRepo.update(userId, { currentLevel: level });

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        // Sync to Neo4j
        try {
            // @ts-ignore
            await this.graphRepo.syncUser({
                userId: user._id.toString(),
                currentLevel: user.currentLevel
            });
        } catch (error) {
            logger.error(`[Neo4j] Failed to sync level update for ${userId}`, error);
        }

        return user;
    }

    async deleteUser(userId: string) {
        const deleted = await this.userRepo.delete(userId);

        if (!deleted) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        // Sync to Neo4j
        try {
            await this.graphRepo.deleteUser(userId);
        } catch (error) {
            logger.error(`[Neo4j] Failed to delete user ${userId}`, error);
        }

        return true;
    }

    async getUserById(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
        return user;
    }
}

export const userService = new UserService(new UserMongoRepository(), new UserGraphRepository());
