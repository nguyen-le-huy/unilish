import { useEffect, useState } from 'react';

const getRemainingSeconds = (expiresAt?: string): number => {
    if (!expiresAt) {
        return 0;
    }

    const expiresAtMs = new Date(expiresAt).getTime();
    return Math.max(Math.floor((expiresAtMs - Date.now()) / 1000), 0);
};

export const useTestTimer = (expiresAt?: string): number => {
    const [timeRemaining, setTimeRemaining] = useState<number>(() => getRemainingSeconds(expiresAt));

    useEffect(() => {
        if (!expiresAt) {
            setTimeRemaining(0);
            return;
        }

        const tick = () => {
            setTimeRemaining(getRemainingSeconds(expiresAt));
        };

        tick();
        const intervalId = window.setInterval(tick, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [expiresAt]);

    return timeRemaining;
};
