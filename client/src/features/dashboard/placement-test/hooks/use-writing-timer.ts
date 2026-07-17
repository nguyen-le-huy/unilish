import { useEffect, useRef, useState } from 'react';

interface UseWritingTimerOptions {
    timeLimitMinutes: number;
    initialElapsedSeconds?: number;
    isActive: boolean;
    onExpire: () => void;
}

interface UseWritingTimerResult {
    remainingSeconds: number;
    hasExpired: boolean;
}

export const useWritingTimer = ({
    timeLimitMinutes,
    initialElapsedSeconds = 0,
    isActive,
    onExpire,
}: UseWritingTimerOptions): UseWritingTimerResult => {
    const initialSeconds = Math.max(0, Math.floor(timeLimitMinutes * 60) - Math.max(0, initialElapsedSeconds));
    const remainingSecondsRef = useRef<number>(initialSeconds);
    const isExpiredRef = useRef<boolean>(false);
    const onExpireRef = useRef(onExpire);
    const [remainingSeconds, setRemainingSeconds] = useState<number>(initialSeconds);

    onExpireRef.current = onExpire;

    useEffect(() => {
        const nextInitialSeconds = Math.max(0, Math.floor(timeLimitMinutes * 60) - Math.max(0, initialElapsedSeconds));
        remainingSecondsRef.current = nextInitialSeconds;
        isExpiredRef.current = false;
        setRemainingSeconds(nextInitialSeconds);
    }, [timeLimitMinutes, initialElapsedSeconds]);

    useEffect(() => {
        if (!isActive) {
            return;
        }

        const timerId = window.setInterval(() => {
            if (remainingSecondsRef.current <= 1) {
                window.clearInterval(timerId);
                remainingSecondsRef.current = 0;
                setRemainingSeconds(0);

                if (!isExpiredRef.current) {
                    isExpiredRef.current = true;
                    onExpireRef.current();
                }

                return;
            }

            remainingSecondsRef.current -= 1;
            setRemainingSeconds(remainingSecondsRef.current);
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, [isActive]);

    return {
        remainingSeconds,
        hasExpired: isExpiredRef.current,
    };
};
