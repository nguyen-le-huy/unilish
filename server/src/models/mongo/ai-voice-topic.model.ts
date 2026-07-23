import mongoose from 'mongoose';

export interface IAiVoiceScenario {
    id: string;
    title: string;
    description: string;
    isActive: boolean;
    order: number;
}

export interface IAiVoiceTopic extends mongoose.Document {
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

const AiVoiceScenarioSchema = new mongoose.Schema<IAiVoiceScenario>(
    {
        id: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0, min: 0 },
    },
    { _id: false },
);

const AiVoiceTopicSchema = new mongoose.Schema<IAiVoiceTopic>(
    {
        slug: { type: String, required: true, unique: true, trim: true, index: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        icon: { type: String, default: '✦', trim: true },
        isActive: { type: Boolean, default: true, index: true },
        order: { type: Number, default: 0, min: 0 },
        scenarios: { type: [AiVoiceScenarioSchema], default: [] },
    },
    { timestamps: true },
);

AiVoiceTopicSchema.index({ isActive: 1, order: 1 });

export const AiVoiceTopic = mongoose.model<IAiVoiceTopic>('AiVoiceTopic', AiVoiceTopicSchema);
