import { User } from '../models/user.model.js';
import type { UpdateProfileInput } from '../validations/user.validation.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

export class UserService {
    static async updateProfile(userId: string, data: UpdateProfileInput) {
        const user = await User.findByIdAndUpdate(userId, data, {
            new: true,
            runValidators: true
        }).lean();

        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    static async getProfile(userId: string) {
        const user = await User.findById(userId).lean();
        if (!user) {
            throw new AppError('User not found', HttpStatus.NOT_FOUND);
        }
        return user;
    }
}
