import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { Language, type ILanguage } from '../../models/mongo/language.model.js';

interface LanguageFilters {
    isActive?: boolean;
}

interface UpdateLanguageTtsInput {
    provider: ILanguage['ttsConfig']['provider'];
    voiceId?: string | undefined;
}

export class LanguageMongoRepository extends BaseMongoRepository<ILanguage> {
    constructor() {
        super(Language);
    }

    async findLanguages(filters: LanguageFilters): Promise<ILanguage[]> {
        const query: { isActive?: boolean } = {};

        if (typeof filters.isActive === 'boolean') {
            query.isActive = filters.isActive;
        }

        return this.model
            .find(query)
            .select('-__v')
            .sort({ name: 1 })
            .lean()
            .exec() as Promise<ILanguage[]>;
    }

    async updateTtsConfigByCode(code: string, input: UpdateLanguageTtsInput): Promise<ILanguage | null> {
        return this.model
            .findOneAndUpdate(
                { code: code.toUpperCase() },
                {
                    ttsConfig: {
                        provider: input.provider,
                        voiceId: input.voiceId ?? null,
                    },
                },
                { new: true, runValidators: true },
            )
            .select('-__v')
            .lean()
            .exec() as Promise<ILanguage | null>;
    }
}
