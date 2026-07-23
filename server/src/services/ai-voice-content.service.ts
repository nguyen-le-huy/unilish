import { randomUUID } from 'node:crypto';
import { HttpStatus } from '../constants/http-status.js';
import { AiVoiceTopic, type IAiVoiceScenario, type IAiVoiceTopic } from '../models/mongo/ai-voice-topic.model.js';
import type { AiVoiceTopicBody } from '../validations/ai-voice-content.validation.js';
import { AppError } from '../utils/app-error.js';

const normalizePayload = (payload: AiVoiceTopicBody) => ({
    ...payload,
    scenarios: payload.scenarios.map((scenario, index) => ({
        ...scenario,
        id: scenario.id || randomUUID(),
        order: scenario.order ?? index,
    })),
});

interface AiVoiceTopicRecord {
    _id: unknown;
    slug: string;
    title: string;
    description: string;
    icon: string;
    isActive: boolean;
    order: number;
    scenarios: IAiVoiceScenario[];
    createdAt: Date;
    updatedAt: Date;
}

class AiVoiceContentService {
    async getActiveScenario(topicSlug: string, scenarioId: string): Promise<IAiVoiceScenario> {
        const topic = await AiVoiceTopic.findOne({
            slug: topicSlug,
            isActive: true,
            scenarios: { $elemMatch: { id: scenarioId, isActive: true } },
        }).select('scenarios').lean().exec();

        const scenario = topic?.scenarios.find((item) => item.id === scenarioId && item.isActive);
        if (!scenario) {
            throw new AppError('Tình huống hội thoại không còn khả dụng', HttpStatus.NOT_FOUND);
        }

        return scenario;
    }

    async getPublicCatalog(): Promise<AiVoiceTopicRecord[]> {
        const topics = await AiVoiceTopic.find({ isActive: true })
            .select('-__v')
            .sort({ order: 1, createdAt: 1 })
            .lean()
            .exec() as unknown as AiVoiceTopicRecord[];

        return topics.map((topic) => ({
            ...topic,
            scenarios: topic.scenarios
                .filter((scenario) => scenario.isActive)
                .sort((left, right) => left.order - right.order),
        }));
    }

    async getAdminTopics(): Promise<AiVoiceTopicRecord[]> {
        return AiVoiceTopic.find()
            .select('-__v')
            .sort({ order: 1, createdAt: 1 })
            .lean()
            .exec() as unknown as Promise<AiVoiceTopicRecord[]>;
    }

    async createTopic(payload: AiVoiceTopicBody): Promise<IAiVoiceTopic> {
        if (await AiVoiceTopic.exists({ slug: payload.slug })) {
            throw new AppError('Slug chủ đề đã tồn tại', HttpStatus.BAD_REQUEST);
        }

        return AiVoiceTopic.create(normalizePayload(payload));
    }

    async updateTopic(id: string, payload: AiVoiceTopicBody): Promise<IAiVoiceTopic> {
        if (await AiVoiceTopic.exists({ slug: payload.slug, _id: { $ne: id } })) {
            throw new AppError('Slug chủ đề đã tồn tại', HttpStatus.BAD_REQUEST);
        }

        const updated = await AiVoiceTopic.findByIdAndUpdate(id, normalizePayload(payload), {
            new: true,
            runValidators: true,
        }).select('-__v').lean().exec() as IAiVoiceTopic | null;

        if (!updated) {
            throw new AppError('Không tìm thấy chủ đề hội thoại', HttpStatus.NOT_FOUND);
        }

        return updated;
    }

    async deleteTopic(id: string): Promise<void> {
        const deleted = await AiVoiceTopic.findByIdAndDelete(id).exec();
        if (!deleted) {
            throw new AppError('Không tìm thấy chủ đề hội thoại', HttpStatus.NOT_FOUND);
        }
    }
}

export const aiVoiceContentService = new AiVoiceContentService();
