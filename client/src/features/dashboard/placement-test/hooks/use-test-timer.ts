import { useEffect, useState } from 'react';

export const useTestTimer = (expiresAt?: string): number => {
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    useEffect(() => {
        if (!expiresAt) {
            setTimeRemaining(0);
            return;
        }

        const tick = () => {
            const expiresAtMs = new Date(expiresAt).getTime();
            const next = Math.max(Math.floor((expiresAtMs - Date.now()) / 1000), 0);
            setTimeRemaining(next);
        };

        tick();
        const intervalId = window.setInterval(tick, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [expiresAt]);

    return timeRemaining;
};
