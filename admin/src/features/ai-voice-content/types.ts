export interface AiVoiceScenario {
    id?: string;
    title: string;
    description: string;
    isActive: boolean;
    order: number;
}

export interface AiVoiceTopic {
    _id: string;
    slug: string;
    title: string;
    description: string;
    icon: string;
    isActive: boolean;
    order: number;
    scenarios: AiVoiceScenario[];
    createdAt: string;
    updatedAt: string;
}

export type AiVoiceTopicPayload = Omit<AiVoiceTopic, '_id' | 'createdAt' | 'updatedAt'>;
