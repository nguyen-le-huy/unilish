export interface LearningGoal {
    _id: string;
    slug: string;
    title: string;
    description?: string | null;
    targetAudience?: string | null;
    iconUrl?: string | null;
    supportedLanguages?: string[];
    isActive: boolean;
}
