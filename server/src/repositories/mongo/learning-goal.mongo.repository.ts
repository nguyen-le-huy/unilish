import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { LearningGoal, type ILearningGoal } from '../../models/mongo/learning-goal.model.js';

interface GoalListFilters {
    page: number;
    limit: number;
    isActive?: boolean;
    search?: string;
}

interface GoalListResult {
    goals: ILearningGoal[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export class LearningGoalMongoRepository extends BaseMongoRepository<ILearningGoal> {
    constructor() {
        super(LearningGoal);
    }

    async findWithFilters(filters: GoalListFilters): Promise<GoalListResult> {
        const { page, limit, isActive, search } = filters;
        const skip = (page - 1) * limit;

        const queryFilter: Record<string, unknown> = {};

        if (typeof isActive === 'boolean') {
            queryFilter.isActive = isActive;
        }

        if (search) {
            queryFilter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
            ];
        }

        const [goals, total] = await Promise.all([
            this.model
                .find(queryFilter)
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec() as Promise<ILearningGoal[]>,
            this.model.countDocuments(queryFilter),
        ]);

        return {
            goals,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async findBySlug(slug: string): Promise<ILearningGoal | null> {
        return this.model
            .findOne({ slug })
            .select('-__v')
            .lean()
            .exec() as Promise<ILearningGoal | null>;
    }

    async updateBySlug(slug: string, data: Partial<ILearningGoal>): Promise<ILearningGoal | null> {
        return this.model
            .findOneAndUpdate({ slug }, data, { new: true, runValidators: true })
            .select('-__v')
            .lean()
            .exec() as Promise<ILearningGoal | null>;
    }

    async duplicateBySlug(sourceSlug: string, newSlug: string, newTitle: string): Promise<ILearningGoal> {
        const source = await this.findBySlug(sourceSlug);

        if (!source) {
            throw new Error('Source learning goal not found');
        }

        const duplicateData: Partial<ILearningGoal> = {
            slug: newSlug,
            title: newTitle,
            systemPrompt: source.systemPrompt,
            skillWeights: source.skillWeights,
            ignoredSkills: source.ignoredSkills,
            isActive: false,
            ...(source.iconUrl ? { iconUrl: source.iconUrl } : {}),
        };

        return this.create(duplicateData);
    }

    async toggleStatus(slug: string): Promise<ILearningGoal | null> {
        const goal = await this.model.findOne({ slug }).select('_id isActive').lean().exec();

        if (!goal) {
            return null;
        }

        return this.model
            .findByIdAndUpdate(goal._id, { isActive: !goal.isActive }, { new: true, runValidators: true })
            .select('-__v')
            .lean()
            .exec() as Promise<ILearningGoal | null>;
    }
}
