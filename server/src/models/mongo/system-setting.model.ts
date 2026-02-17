import mongoose from 'mongoose';

export interface ISystemSetting extends mongoose.Document {
    key: string;
    value: any;
    draftValue?: any;
    description?: string;
    lastPublishedAt?: Date;
    publishedBy?: mongoose.Types.ObjectId;
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
            type: mongoose.Schema.Types.Mixed, // Live Config
            required: true
        },
        draftValue: {
            type: mongoose.Schema.Types.Mixed, // Working Draft
            default: null
        },
        description: {
            type: String,
            trim: true
        },
        lastPublishedAt: {
            type: Date
        },
        publishedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

export const SystemSetting = mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);
