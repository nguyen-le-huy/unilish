import React, { useMemo } from 'react';
import classNames from 'classnames';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'outline' | 'ghost';
type ButtonSize = 'md' | 'full';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: React.ReactNode | string;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    leftIcon,
    className,
    ...props
}) => {
    const iconContent = useMemo(() => {
        if (!leftIcon) return null;
        if (typeof leftIcon === 'string') {
            return <img src={leftIcon} alt="" className={styles.iconImg} />;
        }
        return leftIcon;
    }, [leftIcon]);

    return (
        <button
            className={classNames(
                styles.btn,
                styles[variant],
                styles[size],
                className
            )}
            {...props}
        >
            {iconContent && <span className={styles.iconWrapper}>{iconContent}</span>}

            <span className={iconContent ? styles.textWithIcon : undefined}>
                {children}
            </span>
        </button>
    );
};
