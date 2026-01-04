import mongoose from 'mongoose';

export interface ISystemSetting extends mongoose.Document {
    key: string;
    value: any;
    description?: string;
    updatedAt: Date;
}

const SystemSettingSchema = new mongoose.Schema<ISystemSetting>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },
        value: {
            type: mongoose.Schema.Types.Mixed, // Allows flexible structure
            required: true
        },
        description: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
