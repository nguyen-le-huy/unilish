import type { IBaseRepository } from './base.repository.interface.js';
import type { IUser } from '../../models/mongo/user.model.js';

export interface IUserRepository extends IBaseRepository<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
    findByClerkId(clerkId: string): Promise<IUser | null>;
    findByEmailWithPassword(email: string): Promise<IUser | null>;
    findByEmailWithOTP(email: string): Promise<IUser | null>;
    findByGoogleIdOrEmail(googleId: string, email: string): Promise<IUser | null>;
    findByClerkIdOrEmail(clerkId: string, email: string): Promise<IUser | null>;
    findAllWithPagination(query: any): Promise<{ users: IUser[], pagination: any }>;
    getStats(): Promise<any>;
}
