import { useEffect, useRef, useState } from 'react';

interface UseWritingTimerOptions {
    timeLimitMinutes: number;
    isActive: boolean;
    onExpire: () => void;
}

interface UseWritingTimerResult {
    remainingSeconds: number;
    hasExpired: boolean;
}

export const useWritingTimer = ({
    timeLimitMinutes,
    isActive,
    onExpire,
}: UseWritingTimerOptions): UseWritingTimerResult => {
    const initialSeconds = Math.max(1, Math.floor(timeLimitMinutes * 60));
    const remainingSecondsRef = useRef<number>(initialSeconds);
    const isExpiredRef = useRef<boolean>(false);
    const onExpireRef = useRef(onExpire);
    const [remainingSeconds, setRemainingSeconds] = useState<number>(initialSeconds);

    onExpireRef.current = onExpire;

    useEffect(() => {
        const nextInitialSeconds = Math.max(1, Math.floor(timeLimitMinutes * 60));
        remainingSecondsRef.current = nextInitialSeconds;
        isExpiredRef.current = false;
        setRemainingSeconds(nextInitialSeconds);
    }, [timeLimitMinutes]);

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