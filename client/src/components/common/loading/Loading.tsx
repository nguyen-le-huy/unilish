import styles from './Loading.module.css';
import classNames from 'classnames';

interface LoadingProps {
    variant?: 'fullscreen' | 'inline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Loading = ({ variant = 'fullscreen', size = 'md', className }: LoadingProps) => {
    return (
        <div className={classNames(
            styles.container,
            { [styles.fullScreen]: variant === 'fullscreen' },
            className
        )}>
            <div className={classNames(
                styles.spinner,
                styles[size]
            )}></div>
        </div>
    );
};
