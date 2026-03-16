export const formatCountdownLabel = (seconds: number): string => {
    const safeSeconds = Math.max(seconds, 0);
    const minutes = Math.floor(safeSeconds / 60)
        .toString()
        .padStart(2, '0');
    const remain = (safeSeconds % 60)
        .toString()
        .padStart(2, '0');

    return `${minutes}:${remain}`;
};

export const getAutosaveRetryDelayMs = (retryCount: number): number => {
    const boundedRetry = Math.min(Math.max(retryCount, 1), 5);
    return boundedRetry * 1500;
};
