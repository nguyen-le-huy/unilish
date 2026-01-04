import { SystemSetting } from '../models/system-setting.model.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

export class SystemSettingService {
    static async getSetting(key: string) {
        const setting = await SystemSetting.findOne({ key }).lean();
        if (!setting) return null; // Or return default?
        return setting.value;
    }

    static async updateSetting(key: string, value: any, description?: string) {
        const setting = await SystemSetting.findOneAndUpdate(
            { key },
            {
                value,
                ...(description && { description })
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return setting;
    }

    static async getAllSettings() {
        return SystemSetting.find().lean();
    }
}
