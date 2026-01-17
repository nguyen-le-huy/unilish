import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';
import styles from "./OTPInput.module.css";

interface OTPInputProps {
    length?: number;
    onComplete?: (otp: string) => void;
}

const OTPInput = ({ length = 4, onComplete }: OTPInputProps) => {
    const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        // Enforce number only
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        // Take the last character if user types more (though maxlength is 1)
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Trigger complete
        const combinedOtp = newOtp.join('');
        if (combinedOtp.length === length && onComplete) {
            onComplete(combinedOtp);
        }

        // Move to next input if value is entered
        if (value && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
            // Move to previous input on backspace if current is empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').slice(0, length).split('');
        if (data.every(char => !isNaN(Number(char)))) {
            const newOtp = [...otp];
            data.forEach((char, index) => {
                newOtp[index] = char;
            });
            setOtp(newOtp);
            if (data.length === length && onComplete) {
                onComplete(data.join(''));
            }
            // Focus last filled
            const focusIndex = Math.min(data.length, length - 1);
            inputRefs.current[focusIndex]?.focus();
        }
    };

    return (
        <div className={styles.container}>
            {otp.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    placeholder=" "
                    className={styles.input}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                />
            ))}
        </div>
    );
};

export default OTPInput;
