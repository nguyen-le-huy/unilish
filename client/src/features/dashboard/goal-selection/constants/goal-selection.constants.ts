export const GOAL_QUERY_KEY_BASE = ['dashboard', 'learning-goals'] as const;

export const getGoalQueryKey = (languageId?: string) => {
    return [...GOAL_QUERY_KEY_BASE, languageId ?? 'all'] as const;
};

export const GOAL_EMPTY_STATE_MESSAGE = 'Chưa có mục tiêu nào khả dụng. Vui lòng thử lại sau.';
export const GOAL_DESCRIPTION_FALLBACK = 'Mục tiêu học tập được cá nhân hoá theo nhu cầu của bạn.';
