export interface UserProfile {
    id: string;
    name: string;
    username: string;
    avatar: string;
    role: 'student' | 'teacher' | 'admin';
    joinDate: string;
    bio: string;
    streak: number;
}

export interface UserStats {
    level: string;
    totalExp: number;
    vocabLearned: number;
}

export interface ActivityData {
    day: string;
    value: number;
}

export interface Achievement {
    id: string;
    name: string;
    icon: React.ReactNode;
    isUnlocked: boolean;
    type: 'gold' | 'blue' | 'fire' | 'silver';
}
