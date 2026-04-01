import React, { useMemo } from 'react';
import classNames from 'classnames';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'cta';
type ButtonSize = 'md' | 'full';
type ButtonPadding = 'A' | 'B' | string;
type ButtonIconWidth = number | string;
type ButtonFontSize = number | string;
type ButtonIconPosition = 'left' | 'right';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: React.ReactNode | string;
    rightIcon?: React.ReactNode | string;
    icon?: React.ReactNode | string;
    iconPosition?: ButtonIconPosition;
    padding?: ButtonPadding;
    iconWidth?: ButtonIconWidth;
    fontSize?: ButtonFontSize;
    borderColor?: string;
    textColor?: string;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    icon,
    iconPosition = 'left',
    padding,
    iconWidth = 24,
    fontSize = 16,
    borderColor,
    textColor,
    className,
    style,
    ...props
}) => {
    const resolvedPadding = useMemo<ButtonPadding>(() => {
        if (padding) return padding;
        return size === 'full' ? 'B' : 'A';
    }, [padding, size]);

    const resolvedLeftIcon = useMemo(() => {
        if (leftIcon) return leftIcon;
        if (iconPosition === 'left') return icon;
        return null;
    }, [icon, iconPosition, leftIcon]);

    const resolvedRightIcon = useMemo(() => {
        if (rightIcon) return rightIcon;
        if (iconPosition === 'right') return icon;
        return null;
    }, [icon, iconPosition, rightIcon]);

    const iconContent = useMemo(() => {
        if (!resolvedLeftIcon) return null;
        if (typeof resolvedLeftIcon === 'string') {
            return <img src={resolvedLeftIcon} alt="" className={styles.iconImg} />;
        }
        return resolvedLeftIcon;
    }, [resolvedLeftIcon]);

    const rightIconContent = useMemo(() => {
        if (!resolvedRightIcon) return null;
        if (typeof resolvedRightIcon === 'string') {
            return <img src={resolvedRightIcon} alt="" className={styles.iconImg} />;
        }
        return resolvedRightIcon;
    }, [resolvedRightIcon]);

    const buttonPadding = useMemo(() => {
        if (resolvedPadding === 'A') return '15px 20px';
        if (resolvedPadding === 'B') return '10px 20px';
        return resolvedPadding;
    }, [resolvedPadding]);

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
            padding: buttonPadding,
            borderColor: borderColor ?? style?.borderColor,
            color: textColor ?? style?.color,
            '--button-icon-width': buttonIconWidth,
            '--button-font-size': buttonFontSize,
        }) as React.CSSProperties,
        [borderColor, buttonFontSize, buttonIconWidth, buttonPadding, style, textColor],
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
