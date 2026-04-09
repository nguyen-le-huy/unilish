import { useEffect, useState } from 'react';

const getRemainingSeconds = (expiresAt?: string): number => {
    if (!expiresAt) {
        return 0;
    }

    const expiresAtMs = new Date(expiresAt).getTime();
    return Math.max(Math.floor((expiresAtMs - Date.now()) / 1000), 0);
};

export const useTestTimer = (expiresAt?: string): number => {
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!expiresAt) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setTick((t) => t + 1);
        }, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [expiresAt]);

    return getRemainingSeconds(expiresAt);
};
