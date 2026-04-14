import { BaseMongoRepository } from '../base/base.mongo.repository.js';
import { Language, type ILanguage } from '../../models/mongo/language.model.js';

interface LanguageFilters {
    isActive?: boolean;
}

interface LanguageLite {
    _id: ILanguage['_id'];
    name: ILanguage['name'];
    nativeName: ILanguage['nativeName'];
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

    async findLiteById(id: string): Promise<LanguageLite | null> {
        return this.model
            .findById(id)
            .select('_id name nativeName')
            .lean()
            .exec() as Promise<LanguageLite | null>;
    }
}
