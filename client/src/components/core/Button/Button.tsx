import React, { useMemo } from 'react';
import classNames from 'classnames';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'cta';
type ButtonSize = 'md' | 'full';
type ButtonPadding = 'A' | 'B' | string;
type ButtonIconWidth = number | string;
type ButtonFontSize = number | string;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: React.ReactNode | string;
    rightIcon?: React.ReactNode | string;
    padding?: ButtonPadding;
    iconWidth?: ButtonIconWidth;
    fontSize?: ButtonFontSize;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    padding = 'A',
    iconWidth = 24,
    fontSize = 16,
    className,
    style,
    ...props
}) => {
    const iconContent = useMemo(() => {
        if (!leftIcon) return null;
        if (typeof leftIcon === 'string') {
            return <img src={leftIcon} alt="" className={styles.iconImg} />;
        }
        return leftIcon;
    }, [leftIcon]);

    const rightIconContent = useMemo(() => {
        if (!rightIcon) return null;
        if (typeof rightIcon === 'string') {
            return <img src={rightIcon} alt="" className={styles.iconImg} />;
        }
        return rightIcon;
    }, [rightIcon]);

    const buttonPadding = useMemo(() => {
        if (padding === 'A') return 'var(--padding-btnA)';
        if (padding === 'B') return 'var(--padding-btnB)';
        return padding;
    }, [padding]);

    const buttonIconWidth = useMemo(() => {
        if (typeof iconWidth === 'number') {
            return `${iconWidth}px`;
        }

        return iconWidth;
    }, [iconWidth]);

    const buttonFontSize = useMemo(() => {
        if (typeof fontSize === 'number') {
            return `${fontSize}px`;
        }

        return fontSize;
    }, [fontSize]);

    const buttonStyle = useMemo(
        () => ({
            ...style,
            '--button-padding': buttonPadding,
            '--button-icon-width': buttonIconWidth,
            '--button-font-size': buttonFontSize,
        }) as React.CSSProperties,
        [buttonFontSize, buttonIconWidth, buttonPadding, style],
    );

    return (
        <button
            className={classNames(
                styles.btn,
                styles[variant],
                styles[size],
                className
            )}
            style={buttonStyle}
            {...props}
        >
            {iconContent && <span className={styles.iconWrapper}>{iconContent}</span>}

            <span className={iconContent || rightIconContent ? styles.textWithIcon : undefined}>
                {children}
            </span>

            {rightIconContent && <span className={styles.iconWrapper}>{rightIconContent}</span>}
        </button>
    );
};
