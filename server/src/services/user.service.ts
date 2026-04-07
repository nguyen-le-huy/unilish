import { User, ESubscriptionStatus, ESubscriptionPlan } from '../models/mongo/user.model.js';
import { z } from 'zod';
import type { updateProfileSchema, getUsersSchema, updateSubscriptionSchema } from '../validations/user.validation.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { UserMongoRepository } from '../repositories/mongo/user.mongo.repository.js';
import { LanguageMongoRepository } from '../repositories/mongo/language.mongo.repository.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';
import { PlacementTestAttemptMongoRepository } from '../repositories/mongo/placement-test-attempt.mongo.repository.js';
import { logger } from '../utils/logger.js';
import type { IUser } from '../models/mongo/user.model.js';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
type GetUsersQuery = z.infer<typeof getUsersSchema>['query'];
type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>['body'];

export class UserService {
    constructor(
        private readonly userRepo: UserMongoRepository,
        private readonly languageRepo: LanguageMongoRepository,
        private readonly learningGoalRepo: LearningGoalMongoRepository,
        private readonly placementAttemptRepo: PlacementTestAttemptMongoRepository,
    ) { }

    async checkEmailExists(email: string): Promise<boolean> {
        const user = await this.userRepo.findByEmail(email);
        return Boolean(user);
    }

    async createUser(data: Partial<IUser>): Promise<IUser> {
        return this.userRepo.create(data);
    }

    async findByEmail(email: string): Promise<IUser | null> {
        return this.userRepo.findByEmail(email);
    }

    async findByEmailWithPassword(email: string): Promise<IUser | null> {
        return this.userRepo.findByEmailWithPassword(email);
    }

    async findByEmailWithOTP(email: string): Promise<IUser | null> {
        return this.userRepo.findByEmailWithOTP(email);
    }

    async updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null> {
        return this.userRepo.update(userId, data);
    }

    async markVerified(userId: string): Promise<IUser | null> {
        return this.userRepo.update(userId, {
            isVerified: true,
            otp: null,
            otpExpires: null,
        });
    }

    async findByGoogleIdOrEmail(googleId: string, email: string): Promise<IUser | null> {
        return this.userRepo.findByGoogleIdOrEmail(googleId, email);
    }

    async findById(userId: string): Promise<IUser | null> {
        return this.userRepo.findById(userId);
    }

    async updateProfile(userId: string, data: UpdateProfileInput) {
        // Transform nativeLanguage (code) to learningLanguageId (ObjectId)
        if (data.nativeLanguage) {
            const language = await this.languageRepo.findOne({ code: data.nativeLanguage });
            if (language) {
                (data as any).learningLanguageId = language._id;
            }
            // Remove nativeLanguage from the update payload
            delete (data as any).nativeLanguage;
        }

        // Transform learningGoal (slug) to learningGoalId (ObjectId)
        if (data.learningGoal) {
            const goal = await this.learningGoalRepo.findBySlug(data.learningGoal);
            if (goal) {
                (data as any).learningGoalId = goal._id;
            }
            // Remove learningGoal from the update payload
            delete (data as any).learningGoal;
        }

        const user = await this.userRepo.update(userId, data);

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
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

        return user;
    }

    async updateLevel(userId: string, level: string) {
        const user = await this.userRepo.update(userId, { currentLevel: level });

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    async deleteUser(userId: string) {
        const deleted = await this.userRepo.delete(userId);

        if (!deleted) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return true;
    }

    async getUserById(userId: string) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
        const latestAttempt = await this.placementAttemptRepo.findLatestSubmittedByUser(userId);

        if (!latestAttempt?.scoring) {
            return { ...user, placementTestDetails: null };
        }

        const listeningAccuracy = latestAttempt.scoring.listeningTotal > 0
            ? latestAttempt.scoring.listeningCorrect / latestAttempt.scoring.listeningTotal
            : 0;

        const readingAccuracy = latestAttempt.scoring.readingTotal > 0
            ? latestAttempt.scoring.readingCorrect / latestAttempt.scoring.readingTotal
            : 0;

        return {
            ...user,
            placementTestDetails: {
                language: latestAttempt.language,
                status: latestAttempt.status,
                submittedAt: latestAttempt.submittedAt,
                durationSeconds: latestAttempt.durationSeconds,
                totalQuestions: latestAttempt.totalQuestions,
                scoring: latestAttempt.scoring,
                listeningAccuracy,
                readingAccuracy,
            },
        };
    }
}

export const userService = new UserService(
    new UserMongoRepository(),
    new LanguageMongoRepository(),
    new LearningGoalMongoRepository(),
    new PlacementTestAttemptMongoRepository(),
);
