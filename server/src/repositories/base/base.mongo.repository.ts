import mongoose from 'mongoose';
import type { Model, Document } from 'mongoose';
import type { IBaseRepository } from '../../interfaces/repositories/base.repository.interface.js';

export abstract class BaseMongoRepository<T extends Document> implements IBaseRepository<T> {
    constructor(protected readonly model: Model<T>) { }

    async create(data: Partial<T>): Promise<T> {
        return this.model.create(data);
    }

    async findById(id: string): Promise<T | null> {
        return this.model.findById(id).lean().exec() as Promise<T | null>;
    }

    async findAll(filter: any = {}): Promise<T[]> {
        return this.model.find(filter).lean().exec() as Promise<T[]>;
    }

    async update(id: string, data: any): Promise<T | null> {
        return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean().exec() as Promise<T | null>;
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.model.findByIdAndDelete(id).exec();
        return !!result;
    }
}
